import ProTraderModule from './pro_trader_module.js';

const DEFAULT_TICKERS = [
  'SOLUSDT','SRMUSDT','RAYUSDT','FTTUSDT','MNGOUSDT','APTUSDT','STEPUSDT','GALAUSDT','ORDIUSDT','EGLDUSDT',
  'BONKUSDT','MAPSUSDT','COPEUSDT','PICKLEUSDT','KINUSDT','OXYUSDT','HNTUSDT','HUMUSDT',
  'TOKEN1','TOKEN2','TOKEN3','TOKEN4','TOKEN5','TOKEN6','TOKEN7','TOKEN8','TOKEN9','TOKEN10',
  'TOKEN11','TOKEN12','TOKEN13','TOKEN14','TOKEN15','TOKEN16','TOKEN17','TOKEN18','TOKEN19','TOKEN20',
  'TOKEN21','TOKEN22','TOKEN23','TOKEN24','TOKEN25','TOKEN26','TOKEN27','TOKEN28','TOKEN29','TOKEN30',
  'TOKEN31','TOKEN32','TOKEN33','TOKEN34','TOKEN35','TOKEN36','TOKEN37','TOKEN38','TOKEN39','TOKEN40',
  'TOKEN41','TOKEN42','TOKEN43','TOKEN44','TOKEN45','TOKEN46','TOKEN47','TOKEN48','TOKEN49','TOKEN50',
  'TOKEN51','TOKEN52','TOKEN53','TOKEN54','TOKEN55','TOKEN56','TOKEN57','TOKEN58','TOKEN59','TOKEN60',
  'TOKEN61','TOKEN62','TOKEN63','TOKEN64','TOKEN65','TOKEN66','TOKEN67','TOKEN68','TOKEN69','TOKEN70',
  'TOKEN71','TOKEN72','TOKEN73','TOKEN74','TOKEN75','TOKEN76','TOKEN77','TOKEN78','TOKEN79','TOKEN80',
  'TOKEN81','TOKEN82','TOKEN83','TOKEN84','TOKEN85','TOKEN86','TOKEN87','TOKEN88','TOKEN89','TOKEN90',
  'TOKEN91','TOKEN92','TOKEN93','TOKEN94','TOKEN95','TOKEN96','TOKEN97','TOKEN98','TOKEN99','TOKEN100'
];

let CONFIG = {
  tickers: [...DEFAULT_TICKERS],
  pollIntervalMs: 5000,
  topN: 10,
  dynamicRefreshMs: 60000,
  dynamicSource: { type: 'gecko', network: 'solana', limit: 120, includeQuoteTokens: false },
  weights: { micro: 1.0, orderbook: 1.3, whale: 1.0, volume: 1.0, trader: 1.2, velocity: 1.0 }
};

let _timer = null;
let _callbacks = new Set();
let _history = {};
let _dynamicTimer = null;
let _tickerUniverse = new Set(CONFIG.tickers);

function normalizeSymbol(symbol) {
  if (!symbol && symbol !== 0) return '';
  return String(symbol).trim().toUpperCase();
}

function sendRuntimeMessage(payload) {
  if (typeof chrome === 'undefined' || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') return;
  try {
    const maybe = chrome.runtime.sendMessage(payload);
    if (maybe && typeof maybe.then === 'function') {
      maybe.catch(() => {});
    }
  } catch (e) {
    console.warn('sendMessage error', e);
  }
}

function setUniverse(list = []) {
  const cleaned = (Array.isArray(list) ? list : [])
    .map(normalizeSymbol)
    .filter(Boolean);
  if (!cleaned.length) {
    _tickerUniverse = new Set(DEFAULT_TICKERS);
  } else {
    _tickerUniverse = new Set(cleaned);
  }

  Object.keys(_history).forEach(sym => {
    if (!_tickerUniverse.has(sym)) delete _history[sym];
  });
}

function getUniverseArray() {
  return Array.from(_tickerUniverse);
}

async function fetchGeckoTrending(fetchFn, { network = 'solana', limit = 120, includeQuoteTokens = false } = {}) {
  const url = `https://api.geckoterminal.com/api/v2/networks/${network}/trending_pools?include=base_token,quote_token&limit=${limit}`;
  const res = await fetchFn(url, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`gecko trending request failed: ${res.status}`);
  const json = await res.json();
  const includedTokens = new Map();
  (json.included || []).forEach(item => {
    if (item && item.type === 'token') {
      const sym = normalizeSymbol(item.attributes && (item.attributes.symbol || item.attributes.name));
      if (sym) includedTokens.set(item.id, sym);
    }
  });
  const tokens = [];
  (json.data || []).forEach(pool => {
    const baseId = pool?.relationships?.base_token?.data?.id;
    const quoteId = pool?.relationships?.quote_token?.data?.id;
    if (baseId && includedTokens.has(baseId)) tokens.push(includedTokens.get(baseId));
    if (includeQuoteTokens && quoteId && includedTokens.has(quoteId)) tokens.push(includedTokens.get(quoteId));
  });
  return Array.from(new Set(tokens));
}

async function refreshDynamicTickers() {
  if (!CONFIG.dynamicSource) return;
  const fetchFn = (typeof fetch === 'function') ? fetch : (typeof globalThis !== 'undefined' ? globalThis.fetch : null);
  if (typeof fetchFn !== 'function') return;

  try {
    let result = [];
    if (typeof CONFIG.dynamicSource === 'function') {
      result = await CONFIG.dynamicSource();
    } else if (Array.isArray(CONFIG.dynamicSource)) {
      result = CONFIG.dynamicSource;
    } else if (CONFIG.dynamicSource.type === 'gecko') {
      result = await fetchGeckoTrending(fetchFn, CONFIG.dynamicSource);
    }

    if (Array.isArray(result) && result.length) {
      setUniverse(result);
      CONFIG.tickers = getUniverseArray();
      scanOnce();
    }
  } catch (e) {
    console.warn('scanner dynamic source error', e);
  }
}

function scheduleDynamicRefresh() {
  if (_dynamicTimer) clearInterval(_dynamicTimer);
  if (!CONFIG.dynamicSource || CONFIG.dynamicRefreshMs == null || CONFIG.dynamicRefreshMs <= 0) return;
  const refresh = () => refreshDynamicTickers();
  refresh();
  _dynamicTimer = setInterval(refresh, CONFIG.dynamicRefreshMs);
}

function computeMockSignals(symbol) {
  const v = () => Math.random() * 2 - 1;
  const micro = v(), orderbook = v(), whale = v(), volume = v(), velocity = v();
  const traderInfluence = ProTraderModule.getInfluence(symbol) || 0;
  return { micro, orderbook, whale, volume, velocity, traderInfluence };
}

function scoreSymbol(symbol) {
  const s = computeMockSignals(symbol);
  const w = CONFIG.weights;
  const raw = (s.micro * w.micro) + (s.orderbook * w.orderbook) + (s.whale * w.whale) + (s.volume * w.volume) + (s.traderInfluence * w.trader) + (s.velocity * w.velocity);
  const normalized = Math.tanh(raw) * 100;
  if (!_history[symbol]) _history[symbol] = [];
  _history[symbol].push({ t: Date.now(), value: normalized });
  if (_history[symbol].length > 12) _history[symbol].shift();
  return { symbol, raw, normalized, components: s, ts: Date.now() };
}

function scanOnce() {
  try {
    const universe = getUniverseArray();
    if (!universe.length) return;
    const scored = universe.map(t => scoreSymbol(t));
    scored.forEach(s => {
      const h = _history[s.symbol] || [];
      if (h.length >= 2) {
        const first = h[0].value;
        const last = h[h.length - 1].value;
        s.velocityScore = last - first;
      } else {
        s.velocityScore = 0;
      }
    });
    scored.sort((a, b) => b.normalized - a.normalized);
    const top = scored.slice(0, CONFIG.topN);
    _callbacks.forEach(cb => { try { cb(top); } catch (e) {} });
    sendRuntimeMessage({ type: 'trendiq:scannerUpdate', top });
  } catch (e) {
    console.warn('scanner error', e);
  }
}

export default {
  init({ pollIntervalMs, onUpdate, tickers, topN } = {}) {
    if (pollIntervalMs != null) CONFIG.pollIntervalMs = pollIntervalMs;
    if (tickers) {
      CONFIG.tickers = [...tickers];
      setUniverse(CONFIG.tickers);
    }
    if (topN != null) CONFIG.topN = topN;
    if (onUpdate) _callbacks.add(onUpdate);
    if (_timer) clearInterval(_timer);
    _timer = setInterval(scanOnce, CONFIG.pollIntervalMs);
    setTimeout(scanOnce, 100);
    scheduleDynamicRefresh();
  },
  setConfig(cfg = {}) {
    if (cfg.pollIntervalMs != null) CONFIG.pollIntervalMs = cfg.pollIntervalMs;
    if (cfg.tickers) {
      CONFIG.tickers = [...cfg.tickers];
      setUniverse(CONFIG.tickers);
    }
    if (cfg.topN != null) CONFIG.topN = cfg.topN;
    if (cfg.dynamicRefreshMs != null) CONFIG.dynamicRefreshMs = cfg.dynamicRefreshMs;
    if (cfg.dynamicSource != null) CONFIG.dynamicSource = cfg.dynamicSource;
    scheduleDynamicRefresh();
  },
  getConfig() { return { ...CONFIG, tickers: getUniverseArray() }; },
  stop() {
    if (_timer) clearInterval(_timer);
    _timer = null;
    if (_dynamicTimer) clearInterval(_dynamicTimer);
    _dynamicTimer = null;
  }
};
