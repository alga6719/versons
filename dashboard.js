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
const scoreChartEl = document.getElementById("scoreChart");

function cloneTokens(tokens) {
  try {
    return JSON.parse(JSON.stringify(tokens));
  } catch (error) {
    console.warn("Unable to clone manifest tokens; returning shallow copy.", error);
    return Array.isArray(tokens) ? [...tokens] : [];
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function readPreloadedManifestTokens() {
  try {
    if (
      window.__TOKEN_MANIFEST_PROMISE__ &&
      typeof window.__TOKEN_MANIFEST_PROMISE__.then === "function"
    ) {
      const manifest = await window.__TOKEN_MANIFEST_PROMISE__;
      if (manifest?.tokens?.length) {
        return manifest.tokens;
      }
    }
  } catch (error) {
    console.warn("Unable to resolve tokens from preloaded manifest promise.", error);
  }

  if (window.__TOKEN_MANIFEST__?.tokens?.length) {
    return window.__TOKEN_MANIFEST__.tokens;
  }

  return null;
}

async function loadTokenManifest() {
  const loadFromPreloaded = async (reason) => {
    const tokens = await readPreloadedManifestTokens();
    if (tokens?.length) {
      if (reason) {
        console.info(reason);
      }
      return cloneTokens(tokens);
    }
    return null;
  };

  const protocol = window?.location?.protocol ?? "";
  const origin = window?.location?.origin ?? "";
  const isFileLikeContext = protocol === "file:" || origin === "null";
  const hasChromeRuntime = typeof chrome !== "undefined" && chrome?.runtime?.getURL;
  const shouldAttemptNetworkFetch = !isFileLikeContext && (hasChromeRuntime || /^https?:$/.test(protocol));

  if (isFileLikeContext) {
    const preloaded = await loadFromPreloaded(
      "Loaded token-manifest.json via inline preload for filesystem usage."
    );
    if (preloaded) {
      return preloaded;
    }

    console.info(
      "Running from a file:// origin without a preloaded manifest; using embedded dataset."
    );
    return cloneTokens(fallbackTokens);
  }

  try {
    if (shouldAttemptNetworkFetch) {
      const manifestUrl = hasChromeRuntime
        ? chrome.runtime.getURL("token-manifest.json")
        : "token-manifest.json";

      const response = await fetch(manifestUrl, { cache: "no-store" });
      if (!response.ok) {
        throw new Error(`Unexpected status ${response.status}`);
      }
      const manifest = await response.json();
      if (Array.isArray(manifest.tokens) && manifest.tokens.length) {
        return cloneTokens(manifest.tokens);
      }
      console.warn("Token manifest missing a populated tokens array. Falling back to embedded data.");
    }
  } catch (error) {
    console.warn("Unable to load token manifest via fetch.", error);
    const preloaded = await loadFromPreloaded(
      "Using preloaded token manifest after fetch failure."
    );
    if (preloaded) {
      return preloaded;
    }
  }

  console.warn("Unable to load token manifest; using embedded dataset instead.");
  return cloneTokens(fallbackTokens);
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
  if (!scoreChartEl) {
    return;
  }

  scoreChartEl.innerHTML = "";

  if (!token || !Array.isArray(token.scoreTrend) || !token.scoreTrend.length) {
    return;
  }

  const trendPoints = token.scoreTrend.slice(-MAX_TREND_POINTS);
  const width = 640;
  const height = 240;
  const margin = { top: 24, right: 24, bottom: 36, left: 56 };
  const usableWidth = width - margin.left - margin.right;
  const usableHeight = height - margin.top - margin.bottom;

  const scores = trendPoints.map((point) => point.score);
  const minScore = Math.min(...scores);
  const maxScore = Math.max(...scores);
  const paddedMin = Math.min(40, minScore - 5);
  const paddedMax = Math.max(100, maxScore + 5);
  const scoreRange = paddedMax - paddedMin || 1;

  const xForIndex = (index) => {
    if (trendPoints.length === 1) {
      return margin.left + usableWidth / 2;
    }
    return margin.left + (usableWidth * index) / (trendPoints.length - 1);
  };

  const yForScore = (score) => {
    const clampedScore = Math.min(Math.max(score, paddedMin), paddedMax);
    return margin.top + (1 - (clampedScore - paddedMin) / scoreRange) * usableHeight;
  };

  const lineSegments = trendPoints
    .map((point, index) => {
      const prefix = index === 0 ? "M" : "L";
      return `${prefix}${xForIndex(index).toFixed(2)} ${yForScore(point.score).toFixed(2)}`;
    })
    .join(" ");

  const baselineY = yForScore(paddedMin).toFixed(2);
  const lastX = xForIndex(trendPoints.length - 1).toFixed(2);
  const firstX = xForIndex(0).toFixed(2);
  const areaPath = `${lineSegments} L${lastX} ${baselineY} L${firstX} ${baselineY} Z`;

  const yTicks = [];
  const tickCount = 4;
  for (let i = 0; i <= tickCount; i += 1) {
    const value = paddedMin + (scoreRange * i) / tickCount;
    yTicks.push({ value: Math.round(value), y: yForScore(value) });
  }

  const xLabels = trendPoints.map((point, index) => ({
    label: point.time,
    x: xForIndex(index),
  }));

  const scorePoints = trendPoints
    .map(
      (point, index) =>
        `<circle class="chart-point" cx="${xForIndex(index).toFixed(2)}" cy="${yForScore(point.score).toFixed(2)}" r="3.5"><title>${escapeHtml(
          `${point.time} • Score ${point.score}`
        )}</title></circle>`
    )
    .join("");

  const eventByTime = new Map((token.events || []).map((event) => [event.time, event]));
  const eventMarkers = trendPoints
    .map((point, index) => {
      const event = eventByTime.get(point.time);
      if (!event) {
        return "";
      }
      const x = xForIndex(index).toFixed(2);
      const y = yForScore(event.score ?? point.score).toFixed(2);
      const detailsParts = [event.label, event.description].filter(Boolean).map(escapeHtml);
      const details = detailsParts.length
        ? detailsParts.join(" — ")
        : escapeHtml(`${point.time} • Score ${event.score ?? point.score}`);
      return `
        <g class="chart-event" transform="translate(${x}, ${y})">
          <circle r="6"></circle>
          <circle class="inner" r="2.4"></circle>
          <title>${details}</title>
        </g>
      `;
    })
    .join("");

  const gridLines = yTicks
    .map(
      (tick) =>
        `<line class="chart-grid-line" x1="${margin.left}" x2="${width - margin.right}" y1="${tick.y.toFixed(
          2
        )}" y2="${tick.y.toFixed(2)}"></line>`
    )
    .join("");

  const yLabels = yTicks
    .map(
      (tick) =>
        `<text class="chart-axis-label" x="${margin.left - 12}" y="${tick.y.toFixed(2)}" text-anchor="end" dominant-baseline="middle">${tick.value}</text>`
    )
    .join("");

  const xAxisLabels = xLabels
    .map(
      (tick) =>
        `<text class="chart-axis-label chart-axis-label--x" x="${tick.x.toFixed(2)}" y="${height - margin.bottom + 20}" text-anchor="middle">${escapeHtml(
          tick.label
        )}</text>`
    )
    .join("");

  scoreChartEl.setAttribute("viewBox", `0 0 ${width} ${height}`);

  scoreChartEl.innerHTML = `
    <defs>
      <linearGradient id="scoreGradient" x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stop-color="rgba(79, 70, 229, 0.24)" />
        <stop offset="100%" stop-color="rgba(79, 70, 229, 0)" />
      </linearGradient>
    </defs>
    <g class="chart-grid">${gridLines}</g>
    <path class="chart-area" d="${areaPath}"></path>
    <path class="chart-line" d="${lineSegments}"></path>
    <line class="chart-axis-line" x1="${margin.left}" x2="${width - margin.right}" y1="${baselineY}" y2="${baselineY}"></line>
    <g class="chart-points">${scorePoints}</g>
    <g class="chart-events">${eventMarkers}</g>
    <g class="chart-axis-y">${yLabels}</g>
    <g class="chart-axis-x">${xAxisLabels}</g>
  `;
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
    if (scoreChartEl) {
      scoreChartEl.innerHTML = "";
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
