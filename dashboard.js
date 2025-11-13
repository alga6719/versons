const symbolSelect = document.getElementById('symbolSelect');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const recText = document.getElementById('recText');
const positionList = document.getElementById('positionList');
const topListDiv = document.getElementById('topList');
const openOpportunities = document.getElementById('openOpportunities');

let chart = null;
let chartReady = false;
let positions = {};

function initChart() {
  if (chartReady) return;
  const canvas = document.getElementById('scoresChart');
  chart = new MiniTrendChart(canvas, { maxPoints: 80, min: -100, max: 100 });
  chartReady = true;
}

function addChartPoint(timeLabel, composite, influenceScaled) {
  if (!chartReady) initChart();
  chart.addPoint(timeLabel, composite, influenceScaled);
}

function setRecommendationText(obj) {
  recText.textContent = JSON.stringify(obj, null, 2);
}

function updatePositions(symbol, decision) {
  positions[symbol] = decision;
  positionList.innerHTML = '';
  Object.keys(positions).forEach(s => {
    const li = document.createElement('li');
    const dec = positions[s] || {};
    li.textContent = `${s}: ${dec.action || 'hold'} size:${(dec.size || 0).toFixed ? (dec.size || 0).toFixed(2) : dec.size} recommendation:${dec.recommendation ? dec.recommendation.action : '-'}`;
    positionList.appendChild(li);
  });
}

if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (!msg || !msg.type) return;

    if (msg.type === 'trendiq:papertradeDecision') {
      const time = new Date().toLocaleTimeString();
      const c = msg.sig.composite || 0;
      const influence = (msg.sig.traderInfluence || 0) * 100;
      addChartPoint(time, c, influence);
      updatePositions(msg.symbol, msg.decision || {});
      if (msg.decision && msg.decision.recommendation) setRecommendationText(msg.decision.recommendation);
    }

    if (msg.type === 'trendiq:scannerUpdate' || msg.type === 'trendiq:topOpportunities') {
      const top = msg.top || msg.topList || [];
      topListDiv.innerHTML = top.map(t => `<div style="padding:6px;border-bottom:1px solid #f1f1f1"><strong>${t.symbol}</strong> — ${Number(t.normalized).toFixed(1)}% <small style="color:#666">${t.raw.toFixed(2)}</small></div>`).join('');
    }
  });
}

startBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'trendiq:startSymbol', symbol: symbolSelect.value });
});

stopBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'trendiq:stopSymbol', symbol: symbolSelect.value });
});

openOpportunities.addEventListener('click', () => {
  window.open(chrome.runtime.getURL('opportunities.html'), '_blank');
});
