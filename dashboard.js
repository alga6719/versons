const symbolSelect = document.getElementById('symbolSelect');
const startBtn = document.getElementById('startBtn');
const stopBtn = document.getElementById('stopBtn');
const recText = document.getElementById('recText');
const positionList = document.getElementById('positionList');
const topListDiv = document.getElementById('topList');
const openOpportunities = document.getElementById('openOpportunities');
const chartCanvas = document.getElementById('scoresChart');
const chartCtx = chartCanvas.getContext('2d');

const positions = {};
const chartState = {
  labels: [],
  composite: [],
  influence: []
};

function renderChart() {
  const width = chartCanvas.width;
  const height = chartCanvas.height;
  const margin = 24;
  const minVal = -100;
  const maxVal = 100;
  const range = maxVal - minVal;

  chartCtx.clearRect(0, 0, width, height);

  chartCtx.strokeStyle = '#e5e7eb';
  chartCtx.lineWidth = 1;
  [minVal, 0, maxVal].forEach(v => {
    const y = margin + (height - margin * 2) * (1 - (v - minVal) / range);
    chartCtx.beginPath();
    chartCtx.moveTo(margin, y);
    chartCtx.lineTo(width - margin, y);
    chartCtx.stroke();
    chartCtx.fillStyle = '#6b7280';
    chartCtx.font = '10px Arial';
    chartCtx.fillText(`${v}`, 4, y + 3);
  });

  const points = chartState.composite.length;
  if (!points) return;

  const stepX = points > 1 ? (width - margin * 2) / (points - 1) : 0;
  const mapY = value => {
    const clamped = Math.max(minVal, Math.min(maxVal, value));
    return margin + (height - margin * 2) * (1 - (clamped - minVal) / range);
  };

  chartCtx.lineWidth = 2;
  chartCtx.strokeStyle = 'rgb(30,99,255)';
  chartCtx.beginPath();
  chartState.composite.forEach((value, idx) => {
    const x = margin + stepX * idx;
    const y = mapY(value);
    if (idx === 0) chartCtx.moveTo(x, y);
    else chartCtx.lineTo(x, y);
  });
  chartCtx.stroke();

  chartCtx.strokeStyle = 'rgb(34,197,94)';
  chartCtx.beginPath();
  chartState.influence.forEach((value, idx) => {
    const x = margin + stepX * idx;
    const y = mapY(value);
    if (idx === 0) chartCtx.moveTo(x, y);
    else chartCtx.lineTo(x, y);
  });
  chartCtx.stroke();
}

function addChartPoint(timeLabel, composite, influenceScaled) {
  chartState.labels.push(timeLabel);
  chartState.composite.push(Number(composite) || 0);
  chartState.influence.push(Number(influenceScaled) || 0);
  if (chartState.labels.length > 80) {
    chartState.labels.shift();
    chartState.composite.shift();
    chartState.influence.shift();
  }
  renderChart();
}

function sendRuntimeMessage(payload) {
  if (typeof chrome === 'undefined' || !chrome.runtime || typeof chrome.runtime.sendMessage !== 'function') {
    return Promise.resolve();
  }
  try {
    const maybe = chrome.runtime.sendMessage(payload);
    if (maybe && typeof maybe.then === 'function') {
      return maybe.catch(() => {});
    }
  } catch (e) {
    console.warn('sendMessage error', e);
  }
  return Promise.resolve();
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
  sendRuntimeMessage({ type: 'trendiq:startSymbol', symbol: symbolSelect.value });
});

stopBtn.addEventListener('click', () => {
  sendRuntimeMessage({ type: 'trendiq:stopSymbol', symbol: symbolSelect.value });
});

openOpportunities.addEventListener('click', () => {
  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function') {
    window.open(chrome.runtime.getURL('opportunities.html'), '_blank');
  } else {
    window.open('opportunities.html', '_blank');
  }
});
