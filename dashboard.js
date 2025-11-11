class TrendIQChart {
  constructor(ctx, config) {
    if (!ctx || !ctx.canvas) {
      throw new Error('Chart requires a 2D context');
    }
    this.ctx = ctx;
    this.data = (config && config.data) || { labels: [], datasets: [] };
    this.options = (config && config.options) || {};
    this.type = (config && config.type) || 'line';
    this.update();
  }

  update() {
    this.#draw();
  }

  destroy() {
    const canvas = this.ctx.canvas;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  #isFiniteNumber(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  #yBounds(datasets, yScale) {
    let min = yScale && this.#isFiniteNumber(yScale.min) ? yScale.min : Infinity;
    let max = yScale && this.#isFiniteNumber(yScale.max) ? yScale.max : -Infinity;

    datasets.forEach(ds => {
      (ds.data || []).forEach(value => {
        if (!this.#isFiniteNumber(value)) return;
        if (value < min) min = value;
        if (value > max) max = value;
      });
    });

    if (!this.#isFiniteNumber(min) || min === Infinity) min = 0;
    if (!this.#isFiniteNumber(max) || max === -Infinity) max = 0;

    if (yScale && this.#isFiniteNumber(yScale.min)) min = yScale.min;
    if (yScale && this.#isFiniteNumber(yScale.max)) max = yScale.max;

    if (min === max) {
      min -= 1;
      max += 1;
    }

    return { min, max };
  }

  #draw() {
    if (this.type !== 'line') {
      console.warn('TrendIQChart only renders line charts');
      return;
    }

    const ctx = this.ctx;
    const canvas = ctx.canvas;
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    const paddingLeft = 45;
    const paddingRight = 10;
    const paddingTop = 15;
    const paddingBottom = 30;
    const plotWidth = width - paddingLeft - paddingRight;
    const plotHeight = height - paddingTop - paddingBottom;
    if (plotWidth <= 0 || plotHeight <= 0) return;

    const labels = this.data.labels || [];
    const datasets = this.data.datasets || [];
    const yScale = this.options?.scales?.y || {};
    const { min, max } = this.#yBounds(datasets, yScale);

    ctx.save();
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(paddingLeft, paddingTop);
    ctx.lineTo(paddingLeft, paddingTop + plotHeight);
    ctx.lineTo(paddingLeft + plotWidth, paddingTop + plotHeight);
    ctx.stroke();

    if (min < 0 && max > 0) {
      const zeroY = paddingTop + plotHeight - ((0 - min) / (max - min)) * plotHeight;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(paddingLeft, zeroY);
      ctx.lineTo(paddingLeft + plotWidth, zeroY);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    ctx.fillStyle = '#6b7280';
    ctx.font = '10px Arial';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';

    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const value = min + ((max - min) * i) / ticks;
      const y = paddingTop + plotHeight - (plotHeight * i) / ticks;
      ctx.fillText(value.toFixed(0), paddingLeft - 6, y);
    }

    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const count = labels.length;
    const step = count > 1 ? plotWidth / (count - 1) : 0;
    labels.forEach((label, idx) => {
      const x = paddingLeft + step * idx;
      if (idx === 0 || idx === count - 1 || idx % Math.ceil(count / 6 || 1) === 0) {
        ctx.fillText(label, x, paddingTop + plotHeight + 6);
      }
    });

    datasets.forEach(ds => {
      const data = ds.data || [];
      if (!data.length) return;
      ctx.beginPath();
      ctx.strokeStyle = ds.borderColor || '#2563eb';
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';

      data.forEach((value, idx) => {
        if (!this.#isFiniteNumber(value)) return;
        const x = paddingLeft + (count > 1 ? (plotWidth * idx) / (count - 1) : 0);
        const y = paddingTop + plotHeight - ((value - min) / (max - min || 1)) * plotHeight;
        if (idx === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    });

    ctx.restore();
  }
}

const Chart = TrendIQChart;

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
      topListDiv.innerHTML = top.map(t => `<div style="padding:6px;border-bottom:1px solid #f1f1f1"><strong>${t.symbol}</strong> — ${Number(t.normalized).toFixed(1)}% <small style="color:#666">${t.raw.toFixed(2)}</small></div>`).join('');
    }
  });
}

function sendRuntimeMessage(payload) {
  if (typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.sendMessage === 'function') {
    chrome.runtime.sendMessage(payload);
  } else {
    console.warn('chrome.runtime.sendMessage is unavailable', payload);
  }
}

startBtn.addEventListener('click', () => {
  sendRuntimeMessage({ type: 'trendiq:startSymbol', symbol: symbolSelect.value });
});

stopBtn.addEventListener('click', () => {
  sendRuntimeMessage({ type: 'trendiq:stopSymbol', symbol: symbolSelect.value });
});

openOpportunities.addEventListener('click', () => {
  const hasRuntimeUrl = typeof chrome !== 'undefined' && chrome.runtime && typeof chrome.runtime.getURL === 'function';
  const url = hasRuntimeUrl ? chrome.runtime.getURL('opportunities.html') : 'opportunities.html';
  window.open(url, '_blank');
});
