import ProTraderModule from './pro_trader_module.js';
import bot from './pro_trader_bot.js';
import GlobalScanner from './global_scanner.js';

console.log('TrendIQ v2.7 background starting');

const agents = {};
let servicesInitialized = false;

const safeSendMessage = payload => {
  if (typeof chrome === 'undefined' || !chrome.runtime || !chrome.runtime.sendMessage) return;
  try {
    chrome.runtime.sendMessage(payload, () => {
      if (chrome.runtime.lastError) {
        console.debug('background message skipped', chrome.runtime.lastError.message);
      }
    });
  } catch (err) {
    console.warn('sendMessage failed', err);
  }
};

const handleTopOpportunitiesUpdate = topList => {
  safeSendMessage({ type: 'trendiq:topOpportunities', topList });
};

function initializeServices({ force = false, reinitializeModule = false } = {}) {
  if (force) {
    servicesInitialized = false;
    if (GlobalScanner.stop) GlobalScanner.stop();
  }
  if (servicesInitialized) return;
  servicesInitialized = true;

  if (ProTraderModule && typeof ProTraderModule.init === 'function') {
    if (reinitializeModule || !ProTraderModule.coinActivity) {
      ProTraderModule.init();
    }
  }

  const config = GlobalScanner && typeof GlobalScanner.getConfig === 'function'
    ? GlobalScanner.getConfig()
    : { pollIntervalMs: 5000, tickers: [], topN: 20 };

  if (GlobalScanner && typeof GlobalScanner.init === 'function') {
    const topN = config.topN ?? 20;
    GlobalScanner.init({
      pollIntervalMs: config.pollIntervalMs ?? 5000,
      tickers: config.tickers ?? [],
      topN,
      onUpdate: handleTopOpportunitiesUpdate
    });
  }
}

initializeServices();

chrome.runtime.onInstalled.addListener(() => {
  initializeServices({ force: true, reinitializeModule: true });
});

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  initializeServices();
  if (!msg || !msg.type) return;
  if (msg.type === 'trendiq:startSymbol') {
    const symbol = msg.symbol;
    if (!agents[symbol]) agents[symbol] = setInterval(() => symbolAgentTick(symbol), 2500);
    sendResponse({ ok: true });
  }
  if (msg.type === 'trendiq:stopSymbol') {
    const symbol = msg.symbol;
    if (agents[symbol]) { clearInterval(agents[symbol]); delete agents[symbol]; }
    sendResponse({ ok: true });
  }
  if (msg.type === 'trendiq:setScannerConfig') {
    GlobalScanner.setConfig(msg.config || {});
    initializeServices({ force: true });
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

    safeSendMessage({
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
