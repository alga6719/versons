# TrendIQ Dashboard Mock

This repository contains a static prototype for the TrendIQ token intelligence dashboard. All assets required to view the mock are checked in so the interface can be exercised without additional build tooling.

## Getting started

1. Install Node.js 18+ (only required if you want to use the helper scripts).
2. From the repository root run:

   ```bash
   npm install
   npm test
   ```

   The test script simply documents that automated tests are not yet available.

3. Serve the mock locally or open the HTML file directly:

   ```bash
   npm start
   ```

   Then browse to [http://localhost:8080/dashboard.html](http://localhost:8080/dashboard.html).

### Loading as a Chrome extension

If you prefer to review the dashboard inside a Chrome extension sandbox:

1. Open `chrome://extensions` in Google Chrome and enable **Developer mode**.
2. Choose **Load unpacked** and select the repository root.
3. Launch the extension from the toolbar or the extensions list to open `dashboard.html`.

## Asset manifest

The committed [`manifest.json`](manifest.json) file enumerates the local assets (`dashboard.html`, `dashboard.js`, `token-manifest.json`, `tf.min.js`, and `adaptive_weights.js`) through the `web_accessible_resources` list so QA reviewers can verify that everything needed for manual testing is present. The dashboard attempts to load token data from [`token-manifest.json`](token-manifest.json) and gracefully falls back to the embedded dataset if the manifest is unavailable.
