document.addEventListener("DOMContentLoaded", () => {
  const ctx = document.getElementById('scoreChart').getContext('2d');

  const tokenLines = {};
  const tokenColors = ['#007aff', '#34c759', '#ff9500', '#ff3b30', '#af52de'];
  const timestamps = [];

  const scoreChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: timestamps,
      datasets: []
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'bottom' } },
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

  const worker = new Worker('bots/adaptive_weights.js');

  worker.onmessage = (event) => {
    const { type, score, symbol, msg } = event.data;
    if (type === 'prediction') {
      const now = new Date().toLocaleTimeString();
      if (!timestamps.includes(now)) timestamps.push(now);
      if (timestamps.length > 10) timestamps.shift();

      if (!tokenLines[symbol]) {
        const color = tokenColors[Object.keys(tokenLines).length % tokenColors.length];
        tokenLines[symbol] = {
          label: symbol,
          data: [],
          fill: false,
          borderColor: color
        };
        scoreChart.data.datasets.push(tokenLines[symbol]);
      }

      const line = tokenLines[symbol];
      line.data.push(score);
      if (line.data.length > 10) line.data.shift();

      scoreChart.data.labels = timestamps;
      scoreChart.update();

      log(`Prediction for ${symbol}: ${score.toFixed(4)}`);
    } else if (type === 'status') {
      log(`Worker: ${msg}`);
    } else if (type === 'error') {
      log(`⚠️ ERROR: ${msg}`);
    }
  };

  async function fetchTop5Solana() {
    const url = "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&category=solana-ecosystem&order=market_cap_desc&per_page=25&page=1&sparkline=false&price_change_percentage=1h,24h";
    try {
      const res = await fetch(url, {
        headers: { 'x-cg-pro-api-key': 'CG-4mhu23ZJbY2MH2xuXwDF2FPa' }
      });
      const tokens = await res.json();
      if (!Array.isArray(tokens)) return;
      const top = tokens.slice(0, 5);
      top.forEach((token, i) => {
        const features = {
          slope: token.price_change_percentage_1h_in_currency / 100,
          volSpike: Math.log(token.total_volume / 1e6),
          obImb: 0,
          recentVolMean: Math.log(token.market_cap / 1e6),
          lastClose: Math.log(token.current_price)
        };
        worker.postMessage({ type: "predict", symbol: token.symbol.toUpperCase(), features });
      });
    } catch (err) {
      log("⚠️ CoinGecko fetch failed.");
      console.warn(err);
    }
  }

  document.querySelector("button").addEventListener("click", () => {
    log("Polling CoinGecko + running ML every 15s...");
    worker.postMessage({ type: "init" });
    fetchTop5Solana();
    setInterval(fetchTop5Solana, 15000);
  });
});