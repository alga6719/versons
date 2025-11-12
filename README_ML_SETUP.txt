TrendIQ / versons — Browser paper-trading & light online training notes
===============================================================

Overview:
- The dashboard now simulates paper trades in the browser (no real orders ever placed).
- A TF.js Web Worker (bots/adaptive_weights.js) loads a pretrained model from:
    1) indexeddb://trendiq-model  (if previously saved after online training)
    2) /model/model.json          (bundled fallback pretrained model)

- The worker supports recording experiences and performing short retraining locally.

Important deployment notes:
- Do NOT hard-code API keys into client code. This update removes the hard-coded CoinGecko key.
- Place a local tf.min.js next to bots/adaptive_weights.js inside the extension bundle if you want fully offline worker loading.
  If tf.min.js is not present locally the worker will try to load tfjs from a CDN.

How it works:
- The dashboard polls CoinGecko (REST) every 15 seconds (no websockets).
- The dashboard constructs a small feature vector per token and asks the worker for a prediction.
- PaperTrader simulates buys and sells based on configurable thresholds, calculates rewards when positions close,
  and sends experiences {x: [...], y: reward} back to the worker.
- The worker stores experiences in-memory and periodically trains on them. After training it attempts to save
  the updated model to IndexedDB so later runs can reuse the improved weights.

Security:
- All training and simulations occur entirely in the user's browser — no data is uploaded.
- Keep tf.min.js packaged with the extension to avoid CDN usage if desired.

Files to drop into your extension:
- bots/adaptive_weights.js  (worker)
- dashboard.js               (updated front-end controller)
- Place pretrained model files under /model/model.json + weights.bin (existing behavior)

Usage:
- Add UI buttons with ids 'startBtn' and 'stopBtn' to dashboard.html (the script looks for them).
- Start the dashboard, it will simulate trades and retrain periodically.
