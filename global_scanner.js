import ProTraderModule from './pro_trader_module.js';

let CONFIG = {
  tickers: [
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
  ],
  pollIntervalMs: 5000,
  topN: 10,
  weights: { micro: 1.0, orderbook: 1.3, whale: 1.0, volume: 1.0, trader: 1.2, velocity: 1.0 },
  apiKeys: { coingecko: null }
};

let _timer = null;
let _callbacks = new Set();
let _history = {};
let _newsCache = { ts: 0, items: [] };
let _marketCache = { ts: 0, items: [] };

const NEWS_TTL_MS = 10 * 60 * 1000;
const MARKET_TTL_MS = 60 * 1000;

const FALLBACK_NEWS = [
  {
    id: 'fallback-1',
    title: 'Market digest unavailable',
    url: 'https://www.coingecko.com',
    body: 'Real-time CoinGecko news could not be loaded because no API key was configured.'
  },
  {
    id: 'fallback-2',
    title: 'Using demo market metrics',
    url: 'https://www.coingecko.com',
    body: 'TrendIQ is operating with mock market data until a CoinGecko API key is supplied in the scanner configuration.'
  }
];

const FALLBACK_MARKETS = [
  { symbol: 'SOLUSDT', price: 0, change24h: 0 },
  { symbol: 'BONKUSDT', price: 0, change24h: 0 },
  { symbol: 'HNTUSDT', price: 0, change24h: 0 }
];

async function ensureNewsCache() {
  const age = Date.now() - _newsCache.ts;
  if (age < NEWS_TTL_MS && _newsCache.items.length) return _newsCache.items;

  const key = CONFIG?.apiKeys?.coingecko;
  if (!key) {
    if (!_newsCache.items.length) _newsCache.items = [...FALLBACK_NEWS];
    _newsCache.ts = Date.now();
    console.info('Skipping CoinGecko news fetch: API key missing');
    return _newsCache.items;
  }

  try {
    const res = await fetch(`https://pro-api.coingecko.com/api/v3/news?token=${encodeURIComponent(key)}`);
    if (!res.ok) {
      throw new Error(`CoinGecko news request failed: ${res.status}`);
    }
    const json = await res.json();
    const items = Array.isArray(json?.data) ? json.data : [];
    _newsCache = { ts: Date.now(), items: items.length ? items : [...FALLBACK_NEWS] };
  } catch (err) {
    console.warn('news fetch failed', err);
    if (!_newsCache.items.length) _newsCache.items = [...FALLBACK_NEWS];
    _newsCache.ts = Date.now();
  }

  return _newsCache.items;
}

async function ensureMarketCache() {
  const age = Date.now() - _marketCache.ts;
  if (age < MARKET_TTL_MS && _marketCache.items.length) return _marketCache.items;

  const key = CONFIG?.apiKeys?.coingecko;
  if (!key) {
    if (!_marketCache.items.length) _marketCache.items = [...FALLBACK_MARKETS];
    _marketCache.ts = Date.now();
    console.info('Skipping CoinGecko markets fetch: API key missing');
    return _marketCache.items;
  }

  const symbols = CONFIG.tickers.slice(0, 50).map(s => s.replace(/USDT$/, '').toLowerCase());
  try {
    const res = await fetch(`https://pro-api.coingecko.com/api/v3/simple/price?ids=${symbols.join(',')}&vs_currencies=usd&include_24hr_change=true`, {
      headers: { 'x-cg-pro-api-key': key }
    });
    if (!res.ok) {
      throw new Error(`CoinGecko markets request failed: ${res.status}`);
    }
    const json = await res.json();
    const items = symbols.map((symbol, idx) => {
      const data = json[symbol] || {};
      return {
        symbol: CONFIG.tickers[idx] || symbol.toUpperCase(),
        price: data.usd ?? 0,
        change24h: data.usd_24h_change ?? 0
      };
    });
    _marketCache = { ts: Date.now(), items };
  } catch (err) {
    console.warn('markets fetch failed', err);
    if (!_marketCache.items.length) _marketCache.items = [...FALLBACK_MARKETS];
    _marketCache.ts = Date.now();
  }

  return _marketCache.items;
}

function refreshExternalCaches() {
  ensureNewsCache().catch(err => console.warn('news refresh error', err));
  ensureMarketCache().catch(err => console.warn('market refresh error', err));
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
    refreshExternalCaches();
    const scored = CONFIG.tickers.map(t => scoreSymbol(t));
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
    try { chrome.runtime.sendMessage({ type: 'trendiq:scannerUpdate', top }); } catch (e) {}
  } catch (e) {
    console.warn('scanner error', e);
  }
}

export default {
  init({ pollIntervalMs, onUpdate, tickers, topN } = {}) {
    if (pollIntervalMs != null) CONFIG.pollIntervalMs = pollIntervalMs;
    if (tickers) CONFIG.tickers = tickers;
    if (topN != null) CONFIG.topN = topN;
    if (onUpdate) _callbacks.add(onUpdate);
    if (_timer) clearInterval(_timer);
    _timer = setInterval(scanOnce, CONFIG.pollIntervalMs);
    setTimeout(scanOnce, 100);
  },
  setConfig(cfg = {}) {
    if (cfg.pollIntervalMs != null) CONFIG.pollIntervalMs = cfg.pollIntervalMs;
    if (cfg.tickers) CONFIG.tickers = cfg.tickers;
    if (cfg.topN != null) CONFIG.topN = cfg.topN;
    if (cfg.coingeckoApiKey) CONFIG.apiKeys.coingecko = cfg.coingeckoApiKey;
  },
  getConfig() {
    const { apiKeys, ...rest } = CONFIG;
    return { ...rest, hasCoinGeckoKey: Boolean(apiKeys?.coingecko) };
  },
  stop() {
    if (_timer) clearInterval(_timer);
    _timer = null;
  }
};
