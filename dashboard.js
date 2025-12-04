document.addEventListener("DOMContentLoaded", () => {
  const chartCanvas = document.getElementById('scoreChart');
  if (!chartCanvas) return;
  const ctx = chartCanvas.getContext('2d');

  const latestRecommendation = document.getElementById('latestRecommendation');
  const openPositionsList = document.getElementById('openPositionsList');
  const opportunitiesList = document.getElementById('opportunitiesList');
  const scannerTableBody = document.getElementById('scannerTableBody');
  const feedStatus = document.getElementById('feedStatus');

  const tokenLines = new Map();
  const tokenColors = ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de'];
  const timestamps = [];
  const tokenState = new Map();
  const MAX_POINTS = 6;
  let pollingInterval = null;
  let isFetching = false;
  let workerReady = false;
  let feedRequested = false;
  const pendingPredictions = [];

  const scoreChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: []
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom' } },
      scales: {
        y: {
          ticks: {
            callback: (value) => Number(value).toFixed(2)
          }
        }
      },
      animation: false
    }
  });

  function log(msg) {
    const el = document.getElementById('logPanel');
    if (el) {
      const time = new Date().toLocaleTimeString();
      el.innerHTML += `[${time}] ${msg}<br>`;
      el.scrollTop = el.scrollHeight;
    }
  }

  function classifyScore(score) {
    if (score > 0.35) return { label: 'BUY', className: 'buy', bias: 'Long' };
    if (score < -0.35) return { label: 'SELL', className: 'sell', bias: 'Short' };
    return { label: 'HOLD', className: 'hold', bias: 'Neutral' };
  }

  function formatPrice(price) {
    if (!Number.isFinite(price)) return '—';
    if (price >= 100) return `$${price.toFixed(0)}`;
    if (price >= 1) return `$${price.toFixed(2)}`;
    return `$${price.toFixed(4)}`;
  }

  function updateLists() {
    const entries = Array.from(tokenState.values()).filter(item => typeof item.score === 'number');
    entries.sort((a, b) => b.score - a.score);

    // Latest recommendation card
    if (!entries.length) {
      if (latestRecommendation) {
        latestRecommendation.className = 'recommendation-pill';
        latestRecommendation.innerHTML = '<span class="label">Waiting for live data…</span><small class="subtext">Live feed initializing…</small>';
      }
    } else {
      const top = entries[0];
      const status = classifyScore(top.score);
      if (latestRecommendation) {
        latestRecommendation.className = `recommendation-pill ${status.className}`.trim();
        latestRecommendation.innerHTML = `
          <span class="label">${status.label} · ${top.symbol}</span>
          <small class="subtext">${status.bias} bias · score ${top.score.toFixed(2)}</small>
          <small class="subtext">Last price ${formatPrice(top.price)} | 1h ${top.change1h?.toFixed(2) ?? '0.00'}%</small>
        `;
      }
    }

    function renderList(listEl, items, limit, emptyText) {
      if (!listEl) return;
      listEl.innerHTML = '';
      if (!items.length) {
        listEl.classList.add('empty');
        const li = document.createElement('li');
        li.textContent = emptyText;
        listEl.appendChild(li);
        return;
      }
      listEl.classList.remove('empty');
      items.slice(0, limit).forEach(item => {
        const status = classifyScore(item.score);
        const li = document.createElement('li');
        const meta = document.createElement('div');
        meta.className = 'token-meta';
        meta.innerHTML = `<strong>${item.symbol}</strong><small>${item.name} · 1h ${item.change1h?.toFixed(2) ?? '0.00'}% · 24h ${item.change24h?.toFixed(2) ?? '0.00'}%</small>`;
        const scoreSpan = document.createElement('span');
        scoreSpan.className = `token-score ${status.className}`;
        scoreSpan.textContent = `${status.label} ${item.score.toFixed(2)}`;
        li.appendChild(meta);
        li.appendChild(scoreSpan);
        listEl.appendChild(li);
      });
    }

    renderList(openPositionsList, entries, 3, 'Waiting for live signals…');
    renderList(opportunitiesList, entries, 5, 'Live scoring will appear here.');

    if (scannerTableBody) {
      scannerTableBody.innerHTML = '';
      if (!entries.length) {
        const row = document.createElement('tr');
        const cell = document.createElement('td');
        cell.colSpan = 5;
        cell.style.textAlign = 'center';
        cell.style.color = '#666';
        cell.textContent = 'Awaiting live feed…';
        row.appendChild(cell);
        scannerTableBody.appendChild(row);
      } else {
        entries.slice(0, 5).forEach(item => {
          const status = classifyScore(item.score);
          const row = document.createElement('tr');
          row.innerHTML = `
            <td>${item.symbol}</td>
            <td>${formatPrice(item.price)}</td>
            <td class="${status.className}">${status.label}</td>
            <td>${status.bias} bias · score ${item.score.toFixed(2)}</td>
            <td>${new Date(item.updatedAt).toLocaleTimeString()}</td>
          `;
          scannerTableBody.appendChild(row);
        });
      }
    }
  }

  const worker = new Worker('adaptive_weights.js');

  function appendTimestamp(label) {
    const lastLabel = timestamps[timestamps.length - 1];
    if (lastLabel === label) {
      // Ensure all datasets stay aligned with existing label count.
      const targetLength = timestamps.length;
      tokenLines.forEach(dataset => {
        while (dataset.data.length < targetLength) dataset.data.push(null);
        while (dataset.data.length > targetLength) dataset.data.shift();
      });
      return timestamps.length - 1;
    }

    timestamps.push(label);
    tokenLines.forEach(dataset => {
      dataset.data.push(null);
      if (dataset.data.length > MAX_POINTS) dataset.data.shift();
    });

    if (timestamps.length > MAX_POINTS) {
      timestamps.shift();
    }

    return timestamps.length - 1;
  }

  function ensureDataset(symbol) {
    if (!tokenLines.has(symbol)) {
      const color = tokenColors[tokenLines.size % tokenColors.length];
      const dataset = {
        label: symbol,
        data: Array.from({ length: timestamps.length }, () => null),
        fill: false,
        borderColor: color,
        tension: 0.25,
        spanGaps: true
      };
      tokenLines.set(symbol, dataset);
      scoreChart.data.datasets.push(dataset);
    }
    const dataset = tokenLines.get(symbol);
    while (dataset.data.length < timestamps.length) {
      dataset.data.push(null);
    }
    while (dataset.data.length > timestamps.length) {
      dataset.data.shift();
    }
    return dataset;
  }

  function setFeedStatus(text, tone = 'live') {
    if (!feedStatus) return;
    feedStatus.textContent = text;
    if (tone === 'error') {
      feedStatus.style.color = '#d23c3c';
    } else if (tone === 'loading') {
      feedStatus.style.color = '#ff9500';
    } else {
      feedStatus.style.color = '#34c759';
    }
  }

  function queuePrediction(symbol, features) {
    if (!workerReady) {
      pendingPredictions.push({ symbol, features });
      return;
    }
    worker.postMessage({ type: 'predict', symbol, features });
  }

  function flushPredictionQueue() {
    if (!workerReady || !pendingPredictions.length) return;
    const queue = pendingPredictions.splice(0);
    queue.forEach(item => {
      worker.postMessage({ type: 'predict', symbol: item.symbol, features: item.features });
    });
  }

  function startPolling() {
    if (pollingInterval) return;
    setFeedStatus('Fetching live data…', 'loading');
    fetchTopSolana();
    pollingInterval = setInterval(fetchTopSolana, 20000);
  }

  worker.onmessage = (event) => {
    const { type, score, symbol, msg } = event.data;
    if (type === 'prediction') {
      const now = new Date();
      const label = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const labelIndex = appendTimestamp(label);
      const line = ensureDataset(symbol);
      line.data[labelIndex] = score;

      scoreChart.data.labels = [...timestamps];
      scoreChart.update('none');

      if (tokenState.has(symbol)) {
        const record = tokenState.get(symbol);
        record.score = score;
        record.updatedAt = now.getTime();
        tokenState.set(symbol, record);
      }

      const status = classifyScore(score);
      log(`Prediction for ${symbol}: ${score.toFixed(4)} (${status.bias} bias)`);
      updateLists();
    } else if (type === 'status') {
      log(`Worker: ${msg}`);
      if (!workerReady && /(Loaded model|Model ready|Loaded pretrained model)/.test(msg)) {
        workerReady = true;
        flushPredictionQueue();
        if (feedRequested) {
          startPolling();
          setFeedStatus('Live');
        }
      } else if (/Model not loaded/.test(msg)) {
        if (feedRequested) setFeedStatus('Loading model…', 'loading');
      }
    } else if (type === 'error') {
      log(`⚠️ ERROR: ${msg}`);
      setFeedStatus('Feed error', 'error');
    }
  };

  async function fetchTopSolana() {
    if (isFetching) return;
    isFetching = true;
    setFeedStatus('Fetching live data…', 'loading');
    const url = 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=25&page=1&sparkline=false&price_change_percentage=1h,24h';
    try {
      const res = await fetch(url, {
        headers: { 'x-cg-pro-api-key': 'CG-4mhu23ZJbY2MH2xuXwDF2FPa' }
      });
      if (!res.ok) {
        throw new Error(`CoinGecko responded with ${res.status}`);
      }
      const tokens = await res.json();
      if (!Array.isArray(tokens)) {
        throw new Error('Unexpected response from CoinGecko');
      }
      const top = tokens.slice(0, 5);
      top.forEach(token => {
        const symbol = token.symbol.toUpperCase();
        tokenState.set(symbol, {
          symbol,
          name: token.name,
          price: token.current_price,
          change1h: token.price_change_percentage_1h_in_currency,
          change24h: token.price_change_percentage_24h_in_currency,
          score: tokenState.get(symbol)?.score,
          updatedAt: Date.now()
        });
        const features = {
          slope: (token.price_change_percentage_1h_in_currency ?? 0) / 100,
          volSpike: token.total_volume > 0 ? Math.log(token.total_volume / 1e6) : 0,
          obImb: 0,
          recentVolMean: token.market_cap > 0 ? Math.log(token.market_cap / 1e6) : 0,
          lastClose: token.current_price > 0 ? Math.log(token.current_price) : 0
        };
        queuePrediction(symbol, features);
      });
      log(`Fetched ${top.length} Solana ecosystem tokens for scoring.`);
      setFeedStatus('Live');
    } catch (err) {
      console.warn(err);
      log(`⚠️ CoinGecko fetch failed: ${err.message}`);
      setFeedStatus('CoinGecko error', 'error');
    } finally {
      isFetching = false;
    }
  }

  function requestLiveFeed() {
    if (feedRequested) return;
    feedRequested = true;
    log('Starting live feed — preparing live worker and CoinGecko polling.');
    setFeedStatus('Loading model…', 'loading');
    worker.postMessage({ type: 'init' });
    worker.postMessage({ type: 'status-check' });
    if (workerReady) {
      startPolling();
    }
  }

  requestLiveFeed();
});
