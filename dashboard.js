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

function escapeHtml(str = '') {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function initChart() {
  const ctx = document.getElementById('scoresChart').getContext('2d');
  chart = new Chart(ctx, {
    type: 'line',
    data: { labels: [], datasets: [
      { label: 'Composite', data: [], borderColor: 'rgb(30,99,255)', tension: 0.2, pointRadius: 0 },
      { label: 'Trader Influence (scaled)', data: [], borderColor: 'rgb(34,197,94)', tension: 0.2, pointRadius: 0 }
    ] },
    options: { animation: false, responsive: true, scales: { y: { min: -100, max: 100 } } }
  });
  chartReady = true;
}

function addChartPoint(timeLabel, composite, influenceScaled) {
  if (!chartReady) initChart();
  chart.data.labels.push(timeLabel);
  chart.data.datasets[0].data.push(composite);
  chart.data.datasets[1].data.push(influenceScaled);
  if (chart.data.labels.length > 80) {
    chart.data.labels.shift();
    chart.data.datasets.forEach(ds => ds.data.shift());
  }
  chart.update();
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
      topListDiv.innerHTML = top.map(t => {
        const reasons = Array.isArray(t?.rationale?.reasons) && t.rationale.reasons.length
          ? t.rationale.reasons.map(reason => `<div class="mini-reason">${escapeHtml(reason)}</div>`).join('')
          : (t?.rationale?.summary ? `<div class="mini-reason">${escapeHtml(t.rationale.summary)}</div>` : '');
        return `<div class="top-item"><strong>${escapeHtml(t.symbol)}</strong> — ${Number(t.normalized).toFixed(1)}% <small>${t.raw.toFixed(2)}</small>${reasons}</div>`;
      }).join('');
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
