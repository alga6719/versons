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

All fonts, icons, and scripts referenced by `dashboard.html` are bundled with the repository so reviewers never have to relax a
 Content Security Policy or allowlist external CDNs to exercise the mock.

### Loading as a Chrome extension

If you prefer to review the dashboard inside a Chrome extension sandbox:

1. Open `chrome://extensions` in Google Chrome and enable **Developer mode**.
2. Choose **Load unpacked** and select the repository root.
3. Click the TrendIQ toolbar icon (or choose **Launch** from the extensions list) and the dashboard will open in a dedicated browser tab.

## Asset manifest

The committed [`manifest.json`](manifest.json) file enumerates the local assets (`dashboard.html`, `dashboard.js`, `token-manifest.json`, `token-manifest-inline.js`, `tf.min.js`, and `adaptive_weights.js`) through the `web_accessible_resources` list so QA reviewers can verify that everything needed for manual testing is present. When the dashboard is loaded as a Chrome extension, the background service worker opens `dashboard.html` in a full browser tab and `token-manifest.json` is resolved through `chrome.runtime.getURL`, ensuring the curated dataset is available without CORS issues.

For reviewers who prefer to open the mock straight from the filesystem, the dashboard now ships with an inline mirror of the JSON manifest at [`token-manifest-inline.js`](token-manifest-inline.js). That file seeds `window.__TOKEN_MANIFEST__` before the loader script executes so `dashboard.js` can consume the curated data without triggering a blocked `fetch` from a `file://` origin. The inline file is generated automatically from [`token-manifest.json`](token-manifest.json); run the snippet below whenever you update the manifest to keep both sources in sync:

```bash
node scripts/generate-inline-manifest.js
```

The helper script rebuilds `token-manifest-inline.js` and ensures filesystem sessions and extension sessions see identical data. If neither source can be resolved, the dashboard will gracefully fall back to the embedded sample dataset without logging blocked fetch errors.
