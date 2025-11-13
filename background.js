import ProTraderModule from './bots/pro_trader_module.js';
import bot from './bots/pro_trader_bot.js';
import GlobalScanner from './global_scanner.js';

console.log('TrendIQ v2.7 background starting');

const agents = {};
let initialized = false;
let scannerCallback = null;

function startScanner() {
  const config = {
    pollIntervalMs: 5000,
    tickers: GlobalScanner.getConfig().tickers,
    topN: 20
  };

  if (!scannerCallback) {
    scannerCallback = topList => {
      try {
        chrome.runtime.sendMessage({ type: 'trendiq:topOpportunities', topList });
      } catch (e) {
        console.warn(e);
      }
    };
  }

  GlobalScanner.init({ ...config, onUpdate: scannerCallback });
}

function ensureInitialized({ force = false } = {}) {
  if (initialized && !force) return;
  ProTraderModule.init();
  startScanner();
  initialized = true;
}

function ensureInitializedAsync(options = {}) {
  return Promise.resolve().then(() => {
    try {
      ensureInitialized(options);
    } catch (err) {
      initialized = false;
      console.error('TrendIQ init failed', err);
      throw err;
    }
  });
}

ensureInitialized();

if (chrome.runtime.onStartup) {
  chrome.runtime.onStartup.addListener(() => ensureInitialized({ force: true }));
}

chrome.runtime.onInstalled.addListener(() => ensureInitialized({ force: true }));

if (typeof self !== 'undefined' && self.addEventListener) {
  self.addEventListener('activate', event => {
    event.waitUntil(ensureInitializedAsync({ force: true }));
  });
  self.addEventListener('install', event => {
    event.waitUntil(ensureInitializedAsync({ force: true }));
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || !msg.type) return;

  ensureInitialized();

  if (msg.type === 'trendiq:startSymbol') {
    const symbol = msg.symbol;
    if (!agents[symbol]) {
      agents[symbol] = setInterval(() => symbolAgentTick(symbol), 2500);
    }
    sendResponse({ ok: true });
  }

  if (msg.type === 'trendiq:stopSymbol') {
    const symbol = msg.symbol;
    if (agents[symbol]) {
      clearInterval(agents[symbol]);
      delete agents[symbol];
    }
    sendResponse({ ok: true });
  }

  if (msg.type === 'trendiq:setScannerConfig') {
    GlobalScanner.setConfig(msg.config || {});
    sendResponse({ ok: true, config: GlobalScanner.getConfig() });
  }
});

async function symbolAgentTick(symbol) {
  try {
    const composite = (Math.random() * 2 - 1) * 100;
    const price = 1 + Math.random() * 10;
    const signal = { composite, price, symbol, ts: Date.now() };
    const decision = (bot && bot.onSignal) ? bot.onSignal(signal) : { action: 'hold' };
    const traderInfluence = (ProTraderModule && ProTraderModule.getInfluence) ? ProTraderModule.getInfluence(symbol) : 0;

    chrome.runtime.sendMessage({
      type: 'trendiq:papertradeDecision',
      symbol,
      sig: { composite, price, traderInfluence, ts: Date.now() },
      decision
    });
  } catch (e) {
    console.warn('symbolAgentTick error', e);
  }
}

self.addEventListener('beforeunload', () => {
  Object.keys(agents).forEach(s => clearInterval(agents[s]));
});
