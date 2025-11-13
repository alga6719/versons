const MAX_TREND_POINTS = 12;

const fallbackTokens = [
  {
    symbol: "SOL",
    name: "Solana",
    bias: "Short bias",
    score: 86,
    scoreClass: "score-good",
    price: "$148.20",
    metrics: [
      { label: "Target Price", value: "$165" },
      { label: "Timeframe", value: "Short • 30m" },
      { label: "Conviction", value: "86 / 100" },
      { label: "Entry Window", value: "Next 12 min" },
      { label: "Projected Move", value: "+11.4%" },
      { label: "Volume Spike", value: "+42% vs 5m avg" },
      { label: "Buy / Sell", value: "62% / 38%" },
      { label: "Smart Money", value: "3 wallets accumulating" }
    ],
    scoreTrend: [
      { time: "10:01", score: 68 },
      { time: "10:02", score: 72 },
      { time: "10:03", score: 78 },
      { time: "10:04", score: 82 },
      { time: "10:05", score: 86 },
      { time: "10:06", score: 84 }
    ],
    events: [
      { time: "10:02", score: 72, label: "Whale entry", description: "3.1M USDC buy spotted from wallet 4fs...d8" },
      { time: "10:04", score: 82, label: "Volume spike", description: "+57% market buys vs prior bar" },
      { time: "10:05", score: 86, label: "News catalyst", description: "DEX listing for SOL staking vault" }
    ],
    rationale: [
      "Market buy ratio climbed above 60% for 4 consecutive minutes, indicating sustained momentum.",
      "Smart money wallets re-accumulated 52K SOL following earlier distribution, signalling confidence.",
      "On-chain alerts show validator unstake queue clearing—reduces near-term sell pressure."
    ],
    whaleBlotter: [
      { time: "10:05", wallet: "Walrus Labs", action: "Bought", size: "12,500 SOL", note: "+$1.8M routed via Jupiter" },
      { time: "10:03", wallet: "4fs…d8", action: "Bought", size: "3,100,000 USDC", note: "Sweep of offers < $147" },
      { time: "10:01", wallet: "Smart LP Cluster", action: "Closed Short", size: "8,900 SOL", note: "Covered on Phoenix" }
    ],
    news: [
      { time: "2m ago", headline: "Solana staking vault launches w/ 12% APY incentives", sentiment: "Bullish" },
      { time: "4m ago", headline: "Validator downtime resolved; cluster latency normal", sentiment: "Neutral" }
    ]
  },
  {
    symbol: "JTO",
    name: "Jito",
    bias: "Long bias",
    score: 79,
    scoreClass: "score-good",
    price: "$3.42",
    metrics: [
      { label: "Target Price", value: "$3.88" },
      { label: "Timeframe", value: "Scalp • 15m" },
      { label: "Conviction", value: "79 / 100" },
      { label: "Entry Window", value: "Buy pullback" },
      { label: "Projected Move", value: "+13%" },
      { label: "Volume Spike", value: "+31%" },
      { label: "Buy / Sell", value: "58% / 42%" },
      { label: "Smart Money", value: "Vaults rotating in" }
    ],
    scoreTrend: [
      { time: "10:01", score: 55 },
      { time: "10:02", score: 61 },
      { time: "10:03", score: 66 },
      { time: "10:04", score: 74 },
      { time: "10:05", score: 79 },
      { time: "10:06", score: 77 }
    ],
    events: [
      { time: "10:03", score: 66, label: "MEV fees surge", description: "+18% validator rewards vs avg" },
      { time: "10:05", score: 79, label: "Staking flows", description: "$420k JTO locked in 5m" }
    ],
    rationale: [
      "Staking contract deposits spiked to 6x hourly pace after fee rebate proposal passed.",
      "Funding flipped positive while OI stayed flat — suggests organic demand over leverage.",
      "Jupiter routing data shows consistent taker demand from repeat wallets."
    ],
    whaleBlotter: [
      { time: "10:04", wallet: "0x9a…12", action: "Bought", size: "180,000 JTO", note: "Smart LP rotation" },
      { time: "10:02", wallet: "Jump Node", action: "Accumulated", size: "$250k", note: "MEV rebate stash" }
    ],
    news: [
      { time: "Live", headline: "Validator council approves next epoch boost", sentiment: "Bullish" },
      { time: "7m ago", headline: "Perp funding stabilises at +0.012%", sentiment: "Neutral" }
    ]
  },
  {
    symbol: "BONK",
    name: "Bonk",
    bias: "Momentum swing",
    score: 73,
    scoreClass: "score-watch",
    price: "$0.000029",
    metrics: [
      { label: "Target Price", value: "$0.000034" },
      { label: "Timeframe", value: "Momentum • 20m" },
      { label: "Conviction", value: "73 / 100" },
      { label: "Entry Window", value: "Breakout retest" },
      { label: "Projected Move", value: "+17%" },
      { label: "Volume Spike", value: "+65%" },
      { label: "Buy / Sell", value: "54% / 46%" },
      { label: "Smart Money", value: "Meme radar ping" }
    ],
    scoreTrend: [
      { time: "10:01", score: 45 },
      { time: "10:02", score: 52 },
      { time: "10:03", score: 60 },
      { time: "10:04", score: 68 },
      { time: "10:05", score: 74 },
      { time: "10:06", score: 73 }
    ],
    events: [
      { time: "10:04", score: 68, label: "Volume burst", description: "2.4B BONK traded on Orca" },
      { time: "10:05", score: 74, label: "Whale sweep", description: "Wallet dgx…41 clears asks" }
    ],
    rationale: [
      "Meme basket ETF wallet rotated back into BONK after 3-day pause.",
      "Funding neutral at +0.001% despite price pop — indicates spot-led bid.",
      "Social sentiment index jumped 22% within 4 minutes."
    ],
    whaleBlotter: [
      { time: "10:05", wallet: "dgx…41", action: "Bought", size: "1.1B BONK", note: "Cleared 4 bps of slippage" },
      { time: "10:03", wallet: "Market Maker Q", action: "Added", size: "450M BONK", note: "Inventory rebuild" }
    ],
    news: [
      { time: "1m ago", headline: "Bonk DAO teases burn schedule update", sentiment: "Bullish" },
      { time: "6m ago", headline: "DEX depth improves after market maker return", sentiment: "Positive" }
    ]
  },
  {
    symbol: "PYTH",
    name: "Pyth Network",
    bias: "Range scalp",
    score: 65,
    scoreClass: "score-watch",
    price: "$0.44",
    metrics: [
      { label: "Target Price", value: "$0.47" },
      { label: "Timeframe", value: "Range • 25m" },
      { label: "Conviction", value: "65 / 100" },
      { label: "Entry Window", value: "Bid wick" },
      { label: "Projected Move", value: "+6.8%" },
      { label: "Volume Spike", value: "+18%" },
      { label: "Buy / Sell", value: "51% / 49%" },
      { label: "Smart Money", value: "Quiet" }
    ],
    scoreTrend: [
      { time: "10:01", score: 58 },
      { time: "10:02", score: 59 },
      { time: "10:03", score: 63 },
      { time: "10:04", score: 66 },
      { time: "10:05", score: 65 },
      { time: "10:06", score: 64 }
    ],
    events: [
      { time: "10:03", score: 63, label: "Oracle push", description: "Deribit integration mention" }
    ],
    rationale: [
      "Pricing oracle uptime at 99.9% with new partners joining — anchors range support.",
      "Market depth on main DEX pairs thickened by 12% after liquidity mining vote.",
      "Neutral funding & low perp OI — ideal for mean reversion scalp."
    ],
    whaleBlotter: [
      { time: "10:02", wallet: "0xpy…th", action: "Bought", size: "480k PYTH", note: "LP hedging" }
    ],
    news: [
      { time: "5m ago", headline: "Pyth announces oracle push to derivatives venues", sentiment: "Positive" }
    ]
  },
  {
    symbol: "W",
    name: "Wormhole",
    bias: "Breakout watch",
    score: 61,
    scoreClass: "score-watch",
    price: "$0.87",
    metrics: [
      { label: "Target Price", value: "$0.96" },
      { label: "Timeframe", value: "Breakout • 45m" },
      { label: "Conviction", value: "61 / 100" },
      { label: "Entry Window", value: "Alert on 0.89" },
      { label: "Projected Move", value: "+9.5%" },
      { label: "Volume Spike", value: "+22%" },
      { label: "Buy / Sell", value: "48% / 52%" },
      { label: "Smart Money", value: "Watching resistance" }
    ],
    scoreTrend: [
      { time: "10:01", score: 52 },
      { time: "10:02", score: 55 },
      { time: "10:03", score: 58 },
      { time: "10:04", score: 60 },
      { time: "10:05", score: 63 },
      { time: "10:06", score: 61 }
    ],
    events: [
      { time: "10:05", score: 63, label: "Bridge volume", description: "+$42M cross-chain flows" }
    ],
    rationale: [
      "Bridge inflows hitting 3-day highs but market sell walls remain heavy.",
      "Token unlock calendar quiet for 48h — reduces supply overhang.",
      "Need confirmation above $0.89 before conviction upgrades."
    ],
    whaleBlotter: [
      { time: "10:05", wallet: "Jump Trading", action: "Observed", size: "--", note: "Quotes tightened" }
    ],
    news: [
      { time: "3m ago", headline: "Wormhole relayer adds Aptos lane", sentiment: "Positive" }
    ]
  },
  {
    symbol: "HNT",
    name: "Helium",
    bias: "Swing long",
    score: 58,
    scoreClass: "score-risk",
    price: "$7.80",
    metrics: [
      { label: "Target Price", value: "$8.40" },
      { label: "Timeframe", value: "Swing • 4h" },
      { label: "Conviction", value: "58 / 100" },
      { label: "Entry Window", value: "Layer bids" },
      { label: "Projected Move", value: "+7.7%" },
      { label: "Volume Spike", value: "+9%" },
      { label: "Buy / Sell", value: "44% / 56%" },
      { label: "Smart Money", value: "Watching mobile stats" }
    ],
    scoreTrend: [
      { time: "10:01", score: 49 },
      { time: "10:02", score: 52 },
      { time: "10:03", score: 54 },
      { time: "10:04", score: 57 },
      { time: "10:05", score: 59 },
      { time: "10:06", score: 58 }
    ],
    events: [
      { time: "10:04", score: 57, label: "Hotspot data", description: "Usage ticks to +14%" }
    ],
    rationale: [
      "Network usage metrics improving but sell pressure persists from unlocked tokens.",
      "Telecom partnership rumors unconfirmed — keep risk controls tight.",
      "Wait for buy/sell ratio flip before scaling."
    ],
    whaleBlotter: [
      { time: "10:03", wallet: "Nova Labs", action: "Transferred", size: "120k HNT", note: "Treasury shuffle" }
    ],
    news: [
      { time: "8m ago", headline: "Helium mobile coverage expands to 36 cities", sentiment: "Neutral" }
    ]
  }
];

let tokens = [...fallbackTokens];
let activeToken = tokens[0] || null;
let currentEventMeta = [];
let scoreChart;

const tokenListEl = document.getElementById("tokenList");
const watchlistCountEl = document.getElementById("watchlistCount");
const emptyStateEl = document.getElementById("emptyState");
const searchInput = document.getElementById("tokenSearch");
const timeframeFilter = document.getElementById("timeframeFilter");
const addTokenBtn = document.getElementById("addTokenBtn");

const activeTokenTitle = document.getElementById("activeTokenTitle");
const metricGrid = document.getElementById("metricGrid");
const rationaleList = document.getElementById("rationaleList");
const eventTimeline = document.getElementById("eventTimeline");
const whaleTable = document.getElementById("whaleTable");
const newsFeed = document.getElementById("newsFeed");

async function loadTokenManifest() {
  try {
    if (window?.location?.protocol === "file:") {
      console.info(
        "Running from the filesystem; browser sandboxing blocks fetching token-manifest.json. Using embedded dataset."
      );
      return [...fallbackTokens];
    }

    const manifestUrl = (() => {
      if (typeof chrome !== "undefined" && chrome?.runtime?.getURL) {
        return chrome.runtime.getURL("token-manifest.json");
      }

      return "token-manifest.json";
    })();

    const response = await fetch(manifestUrl, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`Unexpected status ${response.status}`);
    }
    const manifest = await response.json();
    if (Array.isArray(manifest.tokens) && manifest.tokens.length) {
      return manifest.tokens;
    }
    console.warn("Token manifest missing a populated tokens array. Falling back to embedded data.");
  } catch (error) {
    console.warn("Unable to load token manifest; using embedded dataset instead.", error);
  }
  return [...fallbackTokens];
}

function renderTokenList(list) {
  tokenListEl.innerHTML = "";
  list.forEach((token) => {
    const row = document.createElement("div");
    row.className = `token-row ${token === activeToken ? "active" : ""}`;
    row.dataset.symbol = token.symbol;

    const meta = document.createElement("div");
    meta.className = "meta";
    meta.innerHTML = `
      <span class="symbol">${token.symbol}</span>
      <span class="name">${token.name}</span>
      <span style="font-size:0.75rem; color:var(--muted);">${token.bias}</span>
    `;

    const pill = document.createElement("span");
    pill.className = `score-pill ${token.scoreClass}`;
    pill.textContent = `${token.score}`;

    row.appendChild(meta);
    row.appendChild(pill);
    tokenListEl.appendChild(row);
  });

  watchlistCountEl.textContent = `${list.length} tracked`;
  emptyStateEl.style.display = list.length ? "none" : "block";
}

function updateMetrics(token) {
  metricGrid.innerHTML = "";
  token.metrics.forEach((metric) => {
    const el = document.createElement("div");
    el.className = "metric";
    el.innerHTML = `
      <span class="label">${metric.label}</span>
      <span class="value">${metric.value}</span>
    `;
    metricGrid.appendChild(el);
  });
}

function updateRationale(token) {
  rationaleList.innerHTML = "";
  token.rationale.forEach((item) => {
    const li = document.createElement("li");
    li.textContent = item;
    rationaleList.appendChild(li);
  });
}

function updateTimeline(token) {
  eventTimeline.innerHTML = "";
  token.events.forEach((event) => {
    const wrapper = document.createElement("div");
    wrapper.className = "timeline-item";
    wrapper.innerHTML = `
      <span class="time">${event.time}</span>
      <div>
        <strong>${event.label}</strong><br />
        <span style="color:var(--muted);">${event.description}</span>
      </div>
    `;
    eventTimeline.appendChild(wrapper);
  });
}

function updateWhaleTable(token) {
  whaleTable.innerHTML = "";
  token.whaleBlotter.forEach((entry) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${entry.time}</td>
      <td>${entry.wallet}</td>
      <td>${entry.action}</td>
      <td>${entry.size}</td>
      <td>${entry.note}</td>
    `;
    whaleTable.appendChild(row);
  });
}

function updateNewsFeed(token) {
  newsFeed.innerHTML = "";
  token.news.forEach((item) => {
    const div = document.createElement("div");
    div.className = "news-item";
    div.innerHTML = `
      <span class="time">${item.time}</span>
      <strong>${item.headline}</strong><br />
      <span style="color:var(--muted);">Sentiment: ${item.sentiment}</span>
    `;
    newsFeed.appendChild(div);
  });
}

function buildChart(token) {
  if (!token || !Array.isArray(token.scoreTrend)) {
    if (scoreChart) {
      scoreChart.destroy();
      scoreChart = null;
    }
    currentEventMeta = [];
    return;
  }

  const ctx = document.getElementById("scoreChart");
  const trendPoints = token.scoreTrend.slice(-MAX_TREND_POINTS);
  const labels = trendPoints.map((point) => point.time);
  const scores = trendPoints.map((point) => point.score);
  const eventByTime = new Map((token.events || []).map((ev) => [ev.time, ev]));
  const eventMarkers = labels.map((time) => eventByTime.get(time) || null);
  currentEventMeta = eventMarkers;
  const eventData = eventMarkers.map((ev) => (ev ? ev.score : null));

  if (!scoreChart) {
    scoreChart = new Chart(ctx, {
      type: "line",
      data: {
        labels,
        datasets: [
          {
            label: "Recommendation score",
            data: scores,
            borderColor: "#4f46e5",
            backgroundColor: "rgba(79, 70, 229, 0.12)",
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: 4,
            pointHoverRadius: 6
          },
          {
            label: "Key driver markers",
            data: eventData,
            borderColor: "transparent",
            backgroundColor: "#facc15",
            pointBorderColor: "#f59e0b",
            pointRadius: 6,
            pointHoverRadius: 8,
            showLine: false
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 350,
          easing: "easeOutCubic"
        },
        interaction: {
          mode: "index",
          intersect: false
        },
        scales: {
          x: {
            grid: {
              display: false
            }
          },
          y: {
            suggestedMin: 40,
            suggestedMax: 100,
            ticks: {
              callback: (value) => `${value}`
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              title: (context) => context[0]?.label || "",
              label: (context) => {
                if (context.datasetIndex === 1) {
                  const meta = currentEventMeta[context.dataIndex];
                  if (meta) {
                    return `${meta.label}: ${meta.description}`;
                  }
                  return "";
                }
                return `Score: ${context.formattedValue}`;
              }
            }
          }
        }
      }
    });
  } else {
    scoreChart.data.labels = labels;
    scoreChart.data.datasets[0].data = scores;
    scoreChart.data.datasets[1].data = eventData;
    scoreChart.update("none");
  }
}

function setActiveToken(token) {
  activeToken = token || null;

  document.querySelectorAll(".token-row").forEach((row) => {
    row.classList.toggle("active", activeToken && row.dataset.symbol === activeToken.symbol);
  });

  if (!activeToken) {
    activeTokenTitle.textContent = "Select a token to view insights";
    metricGrid.innerHTML = "";
    rationaleList.innerHTML = "";
    eventTimeline.innerHTML = "";
    whaleTable.innerHTML = "";
    newsFeed.innerHTML = "";
    currentEventMeta = [];
    if (scoreChart) {
      scoreChart.destroy();
      scoreChart = null;
    }
    return;
  }

  activeTokenTitle.textContent = `${activeToken.symbol} / USDC • ${activeToken.bias}`;
  updateMetrics(activeToken);
  updateRationale(activeToken);
  updateTimeline(activeToken);
  updateWhaleTable(activeToken);
  updateNewsFeed(activeToken);
  buildChart(activeToken);
}

function filterTokens(term) {
  const lower = term.trim().toLowerCase();
  if (!lower) {
    renderTokenList(tokens);
    if (!activeToken && tokens.length) {
      setActiveToken(tokens[0]);
    } else if (!tokens.length) {
      setActiveToken(null);
    }
    return tokens;
  }
  const filtered = tokens.filter(
    (token) =>
      token.symbol.toLowerCase().includes(lower) ||
      token.name.toLowerCase().includes(lower)
  );
  renderTokenList(filtered);
  if (!filtered.length) {
    setActiveToken(null);
  } else if (!activeToken || !filtered.includes(activeToken)) {
    setActiveToken(filtered[0]);
  }
  return filtered;
}

async function bootstrap() {
  tokens = await loadTokenManifest();
  if (!Array.isArray(tokens) || !tokens.length) {
    tokens = [...fallbackTokens];
  }

  activeToken = tokens[0] || null;
  renderTokenList(tokens);
  setActiveToken(activeToken);

  tokenListEl.addEventListener("click", (event) => {
    const target = event.target.closest(".token-row");
    if (!target) return;
    const token = tokens.find((item) => item.symbol === target.dataset.symbol);
    if (token) {
      setActiveToken(token);
    }
  });

  searchInput.addEventListener("input", (event) => {
    filterTokens(event.target.value);
  });

  timeframeFilter.addEventListener("change", (event) => {
    if (!activeToken) return;
    const timeframe = event.target.value;
    const labelMap = {
      "5m": "Short bias",
      "15m": "Intraday read",
      "1h": "Macro swing"
    };
    activeTokenTitle.textContent = `${activeToken.symbol} / USDC • ${labelMap[timeframe] || activeToken.bias}`;
  });

  addTokenBtn.addEventListener("click", () => {
    const manualToken = searchInput.value.trim();
    if (!manualToken) {
      alert("Enter a token symbol or contract address to track.");
      return;
    }
    alert(`Mock tracking started for ${manualToken}. Historical data will populate shortly.`);
  });
}

bootstrap();
