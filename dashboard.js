/* dashboard.js (modified to prompt for API key and use chrome.storage/options)
   - will attempt to read coingeckoKey from chrome.storage.local (or localStorage fallback)
   - on first run will show a prompt/banner offering to set the key or open the options page
*/

document.addEventListener('DOMContentLoaded', () => {
  const worker = new Worker('bots/adaptive_weights.js');
  let inited = false;
  worker.onmessage = (ev) => {
    const m = ev.data;
    if (!m) return;
    switch (m.type) {
      case 'inited':
        inited = true;
        console.log('[main] worker initialized');
        break;
      case 'predict_result':
        handlePredictionResult(m.id, m.prediction);
        break;
      case 'recorded':
      case 'train_start':
      case 'train_epoch_end':
      case 'train_done':
      case 'trained_saved':
        console.log('[worker]', m);
        break;
      case 'error':
        console.error('[worker error]', m.message);
        break;
      default:
        console.log('[worker]', m);
    }
  };

  worker.postMessage({type: 'init'});

  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusEl = document.getElementById('status') || document.body;

  let pollingIntervalId = null;
  const POLL_MS = 15000;

  // Storage helpers (prefer chrome.storage.local in extension)
  const isChromeStorage = (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local);
  function getStorage(keys, cb) {
    if (isChromeStorage) return chrome.storage.local.get(keys, cb);
    const res = {};
    keys.forEach(k => res[k] = localStorage.getItem(k));
    cb(res);
  }
  function setStorage(obj, cb) {
    if (isChromeStorage) return chrome.storage.local.set(obj, cb);
    Object.keys(obj).forEach(k => {
      if (typeof obj[k] === 'undefined' || obj[k] === null) localStorage.removeItem(k);
      else localStorage.setItem(k, obj[k]);
    });
    if (cb) cb();
  }

  // API key state
  let coingeckoKey = null;

  function showKeyBanner() {
    // simple banner offering to open options or enter key now
    const banner = document.createElement('div');
    banner.style.position = 'fixed';
    banner.style.bottom = '12px';
    banner.style.right = '12px';
    banner.style.padding = '12px';
    banner.style.background = 'white';
    banner.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    banner.style.zIndex = 9999;

    banner.innerHTML = `
      <div style="font-size:13px;margin-bottom:8px">No CoinGecko API key found. You can add one to increase rate limits.</div>
      <div style="text-align:right">
        <button id="__openOptions">Open Options</button>
        <button id="__enterNow">Enter Now</button>
        <button id="__skipKey">Skip</button>
      </div>
    `;

    document.body.appendChild(banner);

    banner.querySelector('#__openOptions').addEventListener('click', () => {
      if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        // fallback to bundled options page
        window.location.href = 'options.html';
      }
    });

    banner.querySelector('#__enterNow').addEventListener('click', () => {
      const val = prompt('Enter your CoinGecko x-cg-pro-api-key (or cancel to skip):');
      if (val && val.trim()) {
        coingeckoKey = val.trim();
        setStorage({ coingeckoKey }, () => {
          alert('API key saved to storage');
        });
      }
      document.body.removeChild(banner);
      setStorage({ askedForKey: true });
    });

    banner.querySelector('#__skipKey').addEventListener('click', () => {
      document.body.removeChild(banner);
      setStorage({ askedForKey: true });
    });
  }

  // Check storage on load
  getStorage(['coingeckoKey', 'askedForKey'], (res) => {
    if (res && res.coingeckoKey) {
      coingeckoKey = res.coingeckoKey;
    }
    const asked = res && res.askedForKey;
    if (!coingeckoKey && !asked) {
      showKeyBanner();
    }
  });

  // PaperTrader unchanged from previous push
  class PaperTrader {
    constructor(opts = {}) {
      this.cash = opts.initialCash || 10000;
      this.positions = {};
      this.history = [];
      this.tradeSizeUSD = opts.tradeSizeUSD || 50;
      this.buyThreshold = opts.buyThreshold || 0.5;
      this.sellThreshold = opts.sellThreshold || 0.35;
      this.minHoldMs = opts.minHoldMs || 15 * 1000;
    }
    onPrediction(tokenId, score, price, features) {
      const now = Date.now();
      const pos = this.positions[tokenId];
      if (!pos && score >= this.buyThreshold && this.cash >= this.tradeSizeUSD) {
        const amount = this.tradeSizeUSD / price;
        this.cash -= amount * price;
        this.positions[tokenId] = { amount, entryPrice: price, entryFeatures: features, entryTime: now };
        this.history.push({type:'buy', tokenId, price, amount, time: now});
        console.log(`[paper] BUY ${tokenId} @ ${price} amount=${amount.toFixed(6)}`);
      } else if (pos && score <= this.sellThreshold && (now - pos.entryTime) >= this.minHoldMs) {
        const pnlPct = (price - pos.entryPrice) / pos.entryPrice;
        const proceeds = pos.amount * price;
        this.cash += proceeds;
        this.history.push({type:'sell', tokenId, price, amount: pos.amount, pnlPct, time: now});
        console.log(`[paper] SELL ${tokenId} @ ${price} pnlPct=${(pnlPct*100).toFixed(2)}%`);
        const experience = { x: pos.entryFeatures.slice(0,2), y: pnlPct };
        worker.postMessage({type:'record', experiences: [experience]});
        delete this.positions[tokenId];
      }
    }
    portfolioValue(latestPrices) {
      let pv = this.cash;
      for (const [tokenId, pos] of Object.entries(this.positions)) {
        const price = latestPrices[tokenId];
        if (price) pv += pos.amount * price;
      }
      return pv;
    }
  }

  const paper = new PaperTrader({ initialCash: 10000, tradeSizeUSD: 50, buyThreshold: 0.6, sellThreshold: 0.35 });

  const latestPrices = {};

  async function fetchTop5Solana() {
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=5&page=1&sparkline=false';
    try {
      const headers = {};
      if (coingeckoKey) headers['x-cg-pro-api-key'] = coingeckoKey;
      const resp = await fetch(url, { headers });
      if (!resp.ok) throw new Error('fetch failed ' + resp.status);
      const data = await resp.json();
      for (const t of data) {
        const id = t.id || t.symbol || t.name;
        const price = t.current_price || 0;
        latestPrices[id] = price;
        const change24 = (t.price_change_percentage_24h || 0) / 100.0;
        const features = [price, change24];
        worker.postMessage({type: 'predict', id, features});
      }
      const pv = paper.portfolioValue(latestPrices);
      if (statusEl) statusEl.innerText = `Paper cash: $${paper.cash.toFixed(2)}  |  Portfolio value: $${pv.toFixed(2)}`;
    } catch (err) {
      console.error('[main] error fetching market data', err);
    }
  }

  function handlePredictionResult(id, prediction) {
    const price = latestPrices[id] || 0;
    const features = [price, 0];
    paper.onPrediction(id, prediction, price, features);
  }

  function startPolling() {
    if (pollingIntervalId) return;
    fetchTop5Solana();
    pollingIntervalId = setInterval(fetchTop5Solana, POLL_MS);
    trainIntervalId = setInterval(() => { worker.postMessage({type: 'train'}); }, 60 * 1000);
    if (startBtn) startBtn.disabled = true;
    if (stopBtn) stopBtn.disabled = false;
    console.log('[main] started polling and training loop');
  }

  let trainIntervalId = null;
  function stopPolling() {
    if (pollingIntervalId) clearInterval(pollingIntervalId);
    if (trainIntervalId) clearInterval(trainIntervalId);
    pollingIntervalId = null;
    trainIntervalId = null;
    if (startBtn) startBtn.disabled = false;
    if (stopBtn) stopBtn.disabled = true;
    console.log('[main] stopped polling/training loop');
  }

  if (startBtn) startBtn.addEventListener('click', startPolling);
  if (stopBtn) stopBtn.addEventListener('click', stopPolling);

});
