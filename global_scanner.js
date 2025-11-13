import ProTraderModule from './pro_trader_module.js';

const COINGECKO_BASE = 'https://pro-api.coingecko.com/api/v3';
const NEWS_REFRESH_INTERVAL_MS = 5 * 60 * 1000;

let CONFIG = {
  tickers: [],
  pollIntervalMs: 30000,
  topN: 10,
  vsCurrency: 'usd',
  order: 'volume_desc',
  apiKey: null,
  weights: {
    micro: 1.35, // short-term momentum (1h)
    orderbook: 1.1, // 24h change
    whale: 0.9, // 7d change
    volume: 1.0, // relative volume
    marketCap: 0.6, // market cap strength
    trader: 1.2, // pro trader influence
    velocity: 1.0, // intraday velocity calculated from sparkline
    news: 0.8 // live news sentiment and coverage
  }
};

let _timer = null;
let _callbacks = new Set();
let _history = {};
let _isScanning = false;
let _lastScores = new Map();
let _idToSymbol = new Map();
let _latestMarkets = [];
let _lastStats = null;
let _newsCache = new Map();
let _newsFetchedAt = 0;

function headers() {
  const base = { 'Accept': 'application/json' };
  if (CONFIG.apiKey) {
    base['x-cg-pro-api-key'] = CONFIG.apiKey;
  }
  return base;
}

function clamp(value, min = -1, max = 1) {
  if (!isFinite(value)) return 0;
  return Math.max(min, Math.min(max, value));
}

function formatPercent(value) {
  if (!isFinite(value)) return null;
  const precision = Math.abs(value) >= 10 ? 0 : 1;
  return `${value >= 0 ? '+' : ''}${value.toFixed(precision)}%`;
}

function formatCompactUSD(value) {
  if (!isFinite(value) || value === 0) return null;
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';
  if (abs >= 1e12) return `${sign}$${(abs / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `${sign}$${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${sign}$${(abs / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${sign}$${(abs / 1e3).toFixed(1)}K`;
  return `${sign}$${abs.toFixed(0)}`;
}

function formatHours(hours) {
  if (!isFinite(hours)) return null;
  if (hours < 1) return 'last hour';
  if (hours < 24) return `last ${Math.round(hours)}h`;
  const days = hours / 24;
  return `last ${Math.round(days)}d`;
}

function computeStats(coins) {
  const maxVolume = coins.reduce((m, c) => Math.max(m, c.total_volume || 0), 0);
  const maxMarketCap = coins.reduce((m, c) => Math.max(m, c.market_cap || 0), 0);
  const maxAbs1h = coins.reduce((m, c) => Math.max(m, Math.abs(c.price_change_percentage_1h_in_currency || 0)), 0);
  const maxAbs24h = coins.reduce((m, c) => Math.max(m, Math.abs(c.price_change_percentage_24h_in_currency || 0)), 0);
  const maxAbs7d = coins.reduce((m, c) => Math.max(m, Math.abs(c.price_change_percentage_7d_in_currency || 0)), 0);
  return { maxVolume, maxMarketCap, maxAbs1h, maxAbs24h, maxAbs7d };
}

function normalizeChange(value, maxAbs) {
  if (!value || !isFinite(value) || maxAbs === 0) return 0;
  return Math.tanh(value / (maxAbs || 1));
}

function normalizeRelative(value, maxValue) {
  if (!value || !isFinite(value) || maxValue === 0) return 0;
  const ratio = Math.min(value / maxValue, 1);
  return ratio * 2 - 1;
}

function computeVelocityFromSparkline(prices = []) {
  if (!prices.length) return 0;
  const first = prices[0];
  const last = prices[prices.length - 1];
  if (!first || !last) return 0;
  const change = (last - first) / first;
  return Math.tanh(change * 5);
}

function deriveNewsSymbols(item = {}) {
  const sources = [];
  if (Array.isArray(item.coins)) sources.push(...item.coins);
  if (Array.isArray(item.tickers)) sources.push(...item.tickers);
  if (Array.isArray(item.symbols)) sources.push(...item.symbols);
  if (item.coin) sources.push(item.coin);
  const flattened = sources.flatMap(source => {
    if (!source) return [];
    if (typeof source === 'string') return [source];
    if (typeof source.symbol === 'string') return [source.symbol];
    if (typeof source.ticker === 'string') return [source.ticker];
    return [];
  });
  return [...new Set(flattened.map(sym => sym.toUpperCase()))];
}

function deriveArticleTimestamp(item = {}) {
  const candidates = [item.published_at, item.updated_at, item.created_at, item.date, item.timestamp];
  for (const value of candidates) {
    if (!value) continue;
    const parsed = Date.parse(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return Date.now();
}

function deriveArticleSentiment(item = {}) {
  if (typeof item.sentiment_score === 'number') {
    return clamp(item.sentiment_score);
  }

  const sentimentText = [item.sentiment, item.vote_sentiment, item.sentiment_text, item.sentiment_type]
    .map(v => (typeof v === 'string' ? v.toLowerCase() : ''))
    .find(Boolean);
  if (sentimentText) {
    if (sentimentText.includes('bull')) return 0.9;
    if (sentimentText.includes('bear')) return -0.9;
    if (sentimentText.includes('pos')) return 0.7;
    if (sentimentText.includes('neg')) return -0.7;
    if (sentimentText.includes('neutral')) return 0;
  }

  if (typeof item.positive_votes_percentage === 'number') {
    const ratio = item.positive_votes_percentage > 1
      ? item.positive_votes_percentage / 100
      : item.positive_votes_percentage;
    return clamp((ratio - 0.5) * 2);
  }

  if (typeof item.votes_up_percentage === 'number') {
    const ratio = item.votes_up_percentage > 1
      ? item.votes_up_percentage / 100
      : item.votes_up_percentage;
    return clamp((ratio - 0.5) * 2);
  }

  const text = `${item.title || ''} ${item.description || item.content || ''}`.toLowerCase();
  if (text) {
    if (/(hack|lawsuit|exploit|investigation|downgrade|bankrupt|scam)/.test(text)) return -0.6;
    if (/(partnership|surge|record|adoption|integration|upgrade|listing|approval)/.test(text)) return 0.5;
  }

  return 0;
}

async function ensureNewsCache(force = false) {
  if (!force && (Date.now() - _newsFetchedAt) < NEWS_REFRESH_INTERVAL_MS && _newsCache.size) {
    return _newsCache;
  }

  try {
    const params = new URLSearchParams({ per_page: '100' });
    const resp = await fetch(`${COINGECKO_BASE}/news?${params.toString()}`, { headers: headers() });
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`CoinGecko news request failed: ${resp.status} ${text}`);
    }
    const json = await resp.json();
    const items = Array.isArray(json?.data) ? json.data
      : Array.isArray(json?.news) ? json.news
        : Array.isArray(json) ? json
          : [];
    const map = new Map();
    items.forEach(item => {
      const symbols = deriveNewsSymbols(item);
      if (!symbols.length) return;
      const entry = {
        sentiment: deriveArticleSentiment(item),
        ts: deriveArticleTimestamp(item),
        item
      };
      symbols.forEach(symbol => {
        if (!map.has(symbol)) map.set(symbol, []);
        map.get(symbol).push(entry);
      });
    });
    _newsCache = map;
  } catch (e) {
    console.warn('news fetch failed', e);
    if (!_newsCache) {
      _newsCache = new Map();
    }
  } finally {
    _newsFetchedAt = Date.now();
  }

  return _newsCache;
}

function computeNewsComponent(symbol, newsBySymbol) {
  if (!symbol || !newsBySymbol) {
    return { score: 0, mentions: 0, windowHours: 0 };
  }
  const key = symbol.toUpperCase();
  const entries = newsBySymbol.get(key) || [];
  if (!entries.length) {
    return { score: 0, mentions: 0, windowHours: 0 };
  }
  const now = Date.now();
  let weighted = 0;
  let totalWeight = 0;
  let oldestTs = now;
  entries.forEach(entry => {
    const ageMs = Math.max(0, now - (entry.ts || now));
    if (entry.ts && entry.ts < oldestTs) oldestTs = entry.ts;
    const ageHours = ageMs / (60 * 60 * 1000);
    const recencyWeight = Math.max(0.1, Math.exp(-ageHours / 12));
    weighted += (entry.sentiment || 0) * recencyWeight;
    totalWeight += recencyWeight;
  });
  const avg = totalWeight ? weighted / totalWeight : 0;
  return {
    score: clamp(avg),
    mentions: entries.length,
    windowHours: Math.max(0, (now - oldestTs) / (60 * 60 * 1000))
  };
}

function computeSignals(coin, stats, newsBySymbol) {
  const micro = normalizeChange(coin.price_change_percentage_1h_in_currency, stats.maxAbs1h || 10);
  const orderbook = normalizeChange(coin.price_change_percentage_24h_in_currency, stats.maxAbs24h || 20);
  const whale = normalizeChange(coin.price_change_percentage_7d_in_currency, stats.maxAbs7d || 30);
  const volume = normalizeRelative(coin.total_volume, stats.maxVolume || 1);
  const marketCap = normalizeRelative(coin.market_cap, stats.maxMarketCap || 1);
  const velocity = computeVelocityFromSparkline(coin.sparkline_in_7d ? coin.sparkline_in_7d.price : []);
  const traderInfluence = ProTraderModule.getInfluence(coin.symbol.toUpperCase()) || 0;
  const { score: news, mentions: newsMentions, windowHours: newsWindowHours } = computeNewsComponent(coin.symbol, newsBySymbol);

  return { micro, orderbook, whale, volume, marketCap, velocity, traderInfluence, news, newsMentions, newsWindowHours };
}

function describeContribution(key, coin, components) {
  switch (key) {
    case 'micro': {
      const pct = formatPercent(coin.price_change_percentage_1h_in_currency);
      if (!pct) return null;
      return `1h momentum ${pct}`;
    }
    case 'orderbook': {
      const pct = formatPercent(coin.price_change_percentage_24h_in_currency);
      if (!pct) return null;
      return `24h trend ${pct}`;
    }
    case 'whale': {
      const pct = formatPercent(coin.price_change_percentage_7d_in_currency);
      if (!pct) return null;
      return `7d performance ${pct}`;
    }
    case 'volume': {
      if ((components.volume || 0) < 0.15) return null;
      const vol = formatCompactUSD(coin.total_volume);
      if (!vol) return null;
      return `Liquidity spike with ${vol} traded (24h)`;
    }
    case 'marketCap': {
      if ((components.marketCap || 0) < 0.15) return null;
      const cap = formatCompactUSD(coin.market_cap);
      if (!cap) return null;
      return `Market cap leadership (${cap})`;
    }
    case 'traderInfluence': {
      if (!isFinite(components.traderInfluence) || components.traderInfluence <= 0) return null;
      return `Pro trader flow trending long (score ${(components.traderInfluence * 100).toFixed(0)}%)`;
    }
    case 'velocity': {
      if (!isFinite(components.velocity) || components.velocity <= 0.15) return null;
      return `Intraday velocity accelerating (${(components.velocity * 100).toFixed(0)}%)`;
    }
    case 'news': {
      if (!isFinite(components.news) || components.news <= 0.1) return null;
      const mentions = components.newsMentions || 0;
      const windowLabel = formatHours(components.newsWindowHours);
      if (mentions > 0) {
        const windowText = windowLabel ? ` ${windowLabel}` : '';
        return `Positive news sentiment from ${mentions} stories${windowText ? ` (${windowText})` : ''}`;
      }
      return 'Positive news sentiment';
    }
    default:
      return null;
  }
}

function deriveRationale(coin, components, weights, normalizedScore) {
  const contributions = [
    { key: 'micro', value: (components.micro || 0) * (weights.micro || 0) },
    { key: 'orderbook', value: (components.orderbook || 0) * (weights.orderbook || 0) },
    { key: 'whale', value: (components.whale || 0) * (weights.whale || 0) },
    { key: 'volume', value: (components.volume || 0) * (weights.volume || 0) },
    { key: 'marketCap', value: (components.marketCap || 0) * (weights.marketCap || 0) },
    { key: 'traderInfluence', value: (components.traderInfluence || 0) * (weights.trader || 0) },
    { key: 'velocity', value: (components.velocity || 0) * (weights.velocity || 0) },
    { key: 'news', value: (components.news || 0) * (weights.news || 0) }
  ];

  const positive = contributions
    .filter(entry => entry.value > 0.12)
    .sort((a, b) => b.value - a.value);

  const reasons = [];
  const seenKeys = new Set();

  positive.forEach(entry => {
    const reason = describeContribution(entry.key, coin, components);
    if (reason && !seenKeys.has(reason)) {
      reasons.push(reason);
      seenKeys.add(reason);
    }
  });

  if (reasons.length < 2) {
    contributions
      .filter(entry => entry.value > 0.05)
      .sort((a, b) => b.value - a.value)
      .forEach(entry => {
        if (reasons.length >= 3) return;
        const reason = describeContribution(entry.key, coin, components);
        if (reason && !seenKeys.has(reason)) {
          reasons.push(reason);
          seenKeys.add(reason);
        }
      });
  }

  if (!reasons.length) {
    reasons.push(`Composite score ${normalizedScore.toFixed(1)}% driven by balanced momentum and liquidity signals`);
  }

  return {
    summary: reasons.join(' • '),
    reasons
  };
}

function buildScore(coin, components) {
  const w = CONFIG.weights;
  const raw = (components.micro * w.micro)
    + (components.orderbook * w.orderbook)
    + (components.whale * w.whale)
    + (components.volume * w.volume)
    + (components.marketCap * w.marketCap)
    + (components.traderInfluence * w.trader)
    + (components.velocity * w.velocity)
    + ((components.news || 0) * (w.news || 0));
  const normalized = Math.tanh(raw) * 100;
  const symbol = coin.symbol.toUpperCase();
  if (!_history[symbol]) _history[symbol] = [];
  _history[symbol].push({ t: Date.now(), value: normalized });
  if (_history[symbol].length > 50) _history[symbol].shift();
  const rationale = deriveRationale(coin, components, w, normalized);
  return {
    id: coin.id,
    name: coin.name,
    symbol,
    price: coin.current_price,
    raw,
    normalized,
    marketCap: coin.market_cap,
    volume: coin.total_volume,
    components,
    rationale,
    newsMentions: components.newsMentions || 0,
    newsWindowHours: components.newsWindowHours || 0,
    ts: Date.now()
  };
}

async function fetchMarketData() {
  const params = new URLSearchParams({
    vs_currency: CONFIG.vsCurrency,
    order: CONFIG.order,
    per_page: '100',
    page: '1',
    sparkline: 'true',
    price_change_percentage: '1h,24h,7d'
  });
  if (CONFIG.tickers && CONFIG.tickers.length) {
    params.set('ids', CONFIG.tickers.map(t => t.toLowerCase()).join(','));
  }
  const response = await fetch(`${COINGECKO_BASE}/coins/markets?${params.toString()}`, { headers: headers() });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`CoinGecko markets request failed: ${response.status} ${text}`);
  }
  return response.json();
}

function updateCaches(scores, markets, stats) {
  _lastScores = new Map();
  _idToSymbol = new Map();
  scores.forEach(score => {
    _lastScores.set(score.symbol, score);
    if (score.id) {
      _idToSymbol.set(score.id.toLowerCase(), score.symbol);
    }
  });
  _latestMarkets = markets;
  _lastStats = stats;
}

async function scanOnce() {
  if (_isScanning) return;
  _isScanning = true;
  try {
    const newsBySymbol = await ensureNewsCache();
    const markets = await fetchMarketData();
    if (!Array.isArray(markets) || markets.length === 0) {
      return;
    }
    if (!CONFIG.tickers || CONFIG.tickers.length === 0) {
      CONFIG.tickers = markets.map(coin => coin.id);
    }
    const stats = computeStats(markets);
    const scored = markets.map(coin => {
      const components = computeSignals(coin, stats, newsBySymbol);
      const score = buildScore(coin, components);
      const history = _history[score.symbol] || [];
      if (history.length >= 2) {
        const first = history[0].value;
        const last = history[history.length - 1].value;
        score.velocityScore = last - first;
      } else {
        score.velocityScore = 0;
      }
      return score;
    });
    scored.sort((a, b) => b.normalized - a.normalized);
    const top = scored.slice(0, CONFIG.topN);
    updateCaches(scored, markets, stats);
    _callbacks.forEach(cb => { try { cb(top); } catch (e) {} });
    try { chrome.runtime.sendMessage({ type: 'trendiq:scannerUpdate', top }); } catch (e) {}
  } catch (e) {
    console.warn('scanner error', e);
  } finally {
    _isScanning = false;
  }
}

async function fetchCoinBySymbol(symbol) {
  if (!symbol) return null;
  const normalized = symbol.toLowerCase();
  const searchResp = await fetch(`${COINGECKO_BASE}/search?query=${encodeURIComponent(symbol)}`, { headers: headers() });
  if (!searchResp.ok) {
    throw new Error(`CoinGecko search failed: ${searchResp.status}`);
  }
  const search = await searchResp.json();
  if (!search || !Array.isArray(search.coins)) return null;
  const directMatch = search.coins.find(c => c.symbol.toLowerCase() === normalized) || search.coins[0];
  if (!directMatch) return null;
  const params = new URLSearchParams({
    vs_currency: CONFIG.vsCurrency,
    ids: directMatch.id,
    sparkline: 'true',
    price_change_percentage: '1h,24h,7d'
  });
  const marketResp = await fetch(`${COINGECKO_BASE}/coins/markets?${params.toString()}`, { headers: headers() });
  if (!marketResp.ok) {
    throw new Error(`CoinGecko single market request failed: ${marketResp.status}`);
  }
  const json = await marketResp.json();
  return Array.isArray(json) && json.length ? json[0] : null;
}

async function resolveSignal(symbol) {
  if (!symbol) return null;
  const key = symbol.toUpperCase();
  let score = _lastScores.get(key);
  if (!score) {
    const mapped = _idToSymbol.get(symbol.toLowerCase());
    if (mapped) {
      score = _lastScores.get(mapped.toUpperCase());
    }
  }
  if (score) {
    return { ...score, ts: Date.now() };
  }
  try {
    const newsBySymbol = await ensureNewsCache();
    const market = await fetchCoinBySymbol(symbol);
    if (!market) return null;
    const stats = _lastStats || computeStats([market]);
    const components = computeSignals(market, stats, newsBySymbol);
    const built = buildScore(market, components);
    return { ...built, ts: Date.now() };
  } catch (e) {
    console.warn('resolveSignal error', e);
    return null;
  }
}

export default {
  async init({ pollIntervalMs, onUpdate, tickers, topN, apiKey, vsCurrency, order, weights } = {}) {
    if (pollIntervalMs != null) CONFIG.pollIntervalMs = pollIntervalMs;
    if (tickers) CONFIG.tickers = tickers;
    if (topN != null) CONFIG.topN = topN;
    if (apiKey) CONFIG.apiKey = apiKey;
    if (vsCurrency) CONFIG.vsCurrency = vsCurrency;
    if (order) CONFIG.order = order;
    if (weights) CONFIG.weights = { ...CONFIG.weights, ...weights };
    if (onUpdate) _callbacks.add(onUpdate);
    if (_timer) clearInterval(_timer);
    _timer = setInterval(() => { scanOnce(); }, CONFIG.pollIntervalMs);
    await scanOnce();
  },
  setConfig(cfg = {}) {
    if (cfg.pollIntervalMs != null) CONFIG.pollIntervalMs = cfg.pollIntervalMs;
    if (cfg.tickers) CONFIG.tickers = cfg.tickers;
    if (cfg.topN != null) CONFIG.topN = cfg.topN;
    if (cfg.apiKey) CONFIG.apiKey = cfg.apiKey;
    if (cfg.vsCurrency) CONFIG.vsCurrency = cfg.vsCurrency;
    if (cfg.order) CONFIG.order = cfg.order;
    if (cfg.weights) CONFIG.weights = { ...CONFIG.weights, ...cfg.weights };
  },
  getConfig() {
    return { ...CONFIG, weights: { ...CONFIG.weights } };
  },
  stop() {
    if (_timer) clearInterval(_timer);
    _timer = null;
  },
  getLatestScores() {
    const seen = new Set();
    const scores = [];
    _lastScores.forEach(score => {
      if (seen.has(score.symbol)) return;
      seen.add(score.symbol);
      scores.push(score);
    });
    return scores;
  },
  async getLiveSignal(symbol) {
    return resolveSignal(symbol);
  }
};
