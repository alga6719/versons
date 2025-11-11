# TrendIQ v2.7 ProTrader — Global Opportunity Engine (Solana)

## Quick start (Chrome)
1. Unzip this folder to `trendiq_v2_7_final`
2. Open Chrome -> `chrome://extensions`
3. Enable Developer mode -> Load unpacked -> select the `trendiq_v2_7_final` folder
4. Open the extension popup (dashboard) and start agents

## Notes
- This build uses mock signals for demonstration. Replace computeMockSignals and symbolAgentTick with real exchange calls for production.
- Add API keys securely and implement rate limiting when connecting to exchanges.
- The background service worker can only be tested in a full Chrome UI environment. To verify bot modules load correctly, reload the unpacked extension via `chrome://extensions` and check the **Service Worker** console for missing module errors.
