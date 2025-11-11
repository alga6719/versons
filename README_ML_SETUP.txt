
📘 TrendIQ v4.2 — ML-Enabled Extension Setup
===========================================

This version uses TensorFlow.js for real-time model predictions.

✅ WHAT'S INCLUDED:
- /bots/adaptive_weights.js — loads a trained model
- /model/ — where you will place your trained model (model.json + weights.bin)
- tf.min.js — must be added locally (download from TF.js)

🔧 SETUP STEPS (to activate ML):

1. 📦 Install dependencies:
   cd trainer
   npm install @tensorflow/tfjs-node node-fetch

2. 🧠 Train the model:
   node train_and_export.js BTCUSDT 1m ../model

   → This will create model.json and weights.bin in ../model/

3. 📁 Add TensorFlow.js:
   - Download tf.min.js from:
     https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@latest/dist/tf.min.js
   - Save it into the root of your extension folder.

4. 🔌 Load the extension:
   - Go to chrome://extensions
   - Enable Developer Mode
   - Load Unpacked → select the root folder (TrendIQ_v4.2_ML)

5. ✅ Run:
   - Open dashboard
   - Click “Start Bot” → you should see “Pretrained model loaded” and scores appear

---

Need Help? Contact your dev or ML engineer. Built for performance. Zero tracking. Full power.
