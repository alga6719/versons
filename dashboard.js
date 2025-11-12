/* dashboard.js (modified)
   - removed hard-coded CoinGecko key
   - adds PaperTrader simulation and experience recording
   - sends data to bots/adaptive_weights.js worker for predictions and training
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
        // expected {id, prediction}
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

  // Initialize the worker/model
  worker.postMessage({type: 'init'});

  // Basic UI hooks (assumes dashboard.html has start/stop buttons)
  const startBtn = document.getElementById('startBtn');
  const stopBtn = document.getElementById('stopBtn');
  const statusEl = document.getElementById('status') || document.body;

  let pollingIntervalId = null;
  const POLL_MS = 15000;

  // Simple PaperTrader
  class PaperTrader {
    constructor(opts = {}) {
      this.cash = opts.initialCash || 10000;
      this.positions = {}; // tokenId -> position {amount, entryPrice, entryFeatures}
      this.history = [];
      this.tradeSizeUSD = opts.tradeSizeUSD || 50;
      this.buyThreshold = opts.buyThreshold || 0.5;   // model output scale is arbitrary; tune
      this.sellThreshold = opts.sellThreshold || 0.35;
      this.minHoldMs = opts.minHoldMs || 15 * 1000; // minimal holding time
    }

    onPrediction(tokenId, score, price, features) {
      // Basic decision rules:
      const now = Date.now();
      const pos = this.positions[tokenId];

      if (!pos && score >= this.buyThreshold && this.cash >= this.tradeSizeUSD) {
        // BUY
        const amount = this.tradeSizeUSD / price;
        this.cash -= amount * price;
        this.positions[tokenId] = {
          amount,
          entryPrice: price,
          entryFeatures: features,
          entryTime: now
        };
        this.history.push({type:'buy', tokenId, price, amount, time: now});
        console.log(`[paper] BUY ${tokenId} @ ${price} amount=${amount.toFixed(6)}`);
      } else if (pos && score <= this.sellThreshold && (now - pos.entryTime) >= this.minHoldMs) {
        // SELL
        const pnlPct = (price - pos.entryPrice) / pos.entryPrice; // relative return
        const proceeds = pos.amount * price;
        this.cash += proceeds;
        this.history.push({type:'sell', tokenId, price, amount: pos.amount, pnlPct, time: now});
        console.log(`[paper] SELL ${tokenId} @ ${price} pnlPct=${(pnlPct*100).toFixed(2)}%`);
        // Record experience: use entryFeatures as x, reward as pnlPct
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

  const paper = new PaperTrader({
    initialCash: 10000,
    tradeSizeUSD: 50,
    buyThreshold: 0.6,
    sellThreshold: 0.35
  });

  // keep latest prices for portfolio value calc
  const latestPrices = {};

  async function fetchTop5Solana() {
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=5&page=1&sparkline=false';
    try {
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('fetch failed ' + resp.status);
      const data = await resp.json();
      // For each token, create a small feature vector and ask worker to predict
      for (const t of data) {
        const id = t.id || t.symbol || t.name;
        const price = t.current_price || 0;
        latestPrices[id] = price;
        // Simple features: normalized price (log), 24h change
        const change24 = (t.price_change_percentage_24h || 0) / 100.0; // scale to [-inf,inf]
        const features = [price, change24];
        // Ask worker for prediction
        worker.postMessage({type: 'predict', id, features});
      }
      // Optionally update a dashboard element with portfolio value
      const pv = paper.portfolioValue(latestPrices);
      if (statusEl) statusEl.innerText = `Paper cash: $${paper.cash.toFixed(2)}  |  Portfolio value: $${pv.toFixed(2)}`;
    } catch (err) {
      console.error('[main] error fetching market data', err);
    }
  }

  function handlePredictionResult(id, prediction) {
    // Scale/interpretation of prediction is model-specific. We treat larger values as 'buy' probability/score.
    // send to paper trader with latest price and original features (we didn't persist features per id here other than price/change)
    const price = latestPrices[id] || 0;
    const features = [price, 0];
    paper.onPrediction(id, prediction, price, features);
  }

  function startPolling() {
    if (pollingIntervalId) return;
    // fetch immediately then every POLL_MS
    fetchTop5Solana();
    pollingIntervalId = setInterval(fetchTop5Solana, POLL_MS);
    // trigger periodic training every 60 seconds
    trainIntervalId = setInterval(() => {
      worker.postMessage({type: 'train'});
    }, 60 * 1000);
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

  // Expose controls (if UI elements exist)
  if (startBtn) startBtn.addEventListener('click', startPolling);
  if (stopBtn) stopBtn.addEventListener('click', stopPolling);

  // Auto-start when worker inited (optional)
  // startPolling();
});
