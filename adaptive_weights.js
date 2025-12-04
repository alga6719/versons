/* 
TrendIQ v4.2 ML Worker — TF.js Worker (extended for simple online training & IndexedDB persistence)
Loads model from IndexedDB://trendiq-model if present, else loads /model/model.json.
Accepts messages:
 - {type: 'init'}            -> loads model
 - {type: 'predict', ...}    -> returns prediction
 - {type: 'record', exp: {...}} -> store experience in local buffer
 - {type: 'train', opts: {...}} -> train on stored experiences and save model to IndexedDB
 - {type: 'export'}          -> save model to IndexedDB (explicit)
*/
importScripts('tf.min.js');

let model = null;
const FEATURE_KEYS = ['slope', 'volSpike', 'obImb', 'recentVolMean', 'lastClose'];
let experienceBuffer = []; // {features: [...], action: -1|0|1, reward: number}
const MAX_BUFFER = 5000;

async function loadPretrainedModel() {
  try {
    // Try load from IndexedDB first
    model = await tf.loadLayersModel('indexeddb://trendiq-model');
    postMessage({ type: 'status', msg: 'Loaded model from IndexedDB' });
  } catch (eIndexed) {
    try {
      model = await tf.loadLayersModel('model/model.json');
      postMessage({ type: 'status', msg: 'Loaded pretrained model from /model/model.json' });
    } catch (e) {
      console.error('Model loading failed', e);
      postMessage({ type: 'error', msg: 'Failed to load pretrained model' });
    }
  }

  // If model exists, ensure compiled
  if (model) {
    model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
  }
}

onmessage = async function (e) {
  const msg = e.data;
  try {
    if (msg.type === 'init') {
      await loadPretrainedModel();
    } else if (msg.type === 'predict') {
      if (!model) return postMessage({ type: 'error', msg: 'Model not loaded' });
      const input = FEATURE_KEYS.map(k => msg.features[k] || 0);
      const tensor = tf.tensor2d([input]);
      const pred = model.predict(tensor);
      const score = (await pred.data())[0];
      postMessage({ type: 'prediction', score, symbol: msg.symbol });
    } else if (msg.type === 'record') {
      // msg.exp: {features: {...}, action: -1|0|1, reward: number}
      const input = FEATURE_KEYS.map(k => msg.exp.features[k] || 0);
      experienceBuffer.push({ x: input, a: msg.exp.action, r: msg.exp.reward });
      if (experienceBuffer.length > MAX_BUFFER) experienceBuffer.shift();
      postMessage({ type: 'status', msg: `Recorded experience (buffer=${experienceBuffer.length})` });
    } else if (msg.type === 'train') {
      if (!model) return postMessage({ type: 'error', msg: 'Model not loaded, cannot train' });
      const opts = msg.opts || { epochs: 6, batchSize: 32 };
      if (experienceBuffer.length < 10) {
        return postMessage({ type: 'status', msg: 'Not enough experiences to train' });
      }
      
      // Prepare supervised training dataset:
      // We'll train the model to predict expected reward given features.
      const xs = tf.tensor2d(experienceBuffer.map(e => e.x));
      const ys = tf.tensor2d(experienceBuffer.map(e => [e.r])); // predict reward

      model.compile({ optimizer: tf.train.adam(0.001), loss: 'meanSquaredError' });
      postMessage({ type: 'status', msg: `Training on ${experienceBuffer.length} samples (epochs=${opts.epochs})` });
      await model.fit(xs, ys, {
        epochs: opts.epochs,
        batchSize: opts.batchSize,
        callbacks: {
          onEpochEnd: (epoch, logs) => postMessage({ type: 'status', msg: `Epoch ${epoch+1}: loss=${logs.loss.toFixed(6)}` })
        }
      });

      xs.dispose(); ys.dispose();

      // Save updated model to IndexedDB
      try {
        await model.save('indexeddb://trendiq-model');
        postMessage({ type: 'status', msg: 'Model trained and saved to IndexedDB' });
      } catch (err) {
        postMessage({ type: 'error', msg: 'Model trained but failed to save to IndexedDB' });
        console.error(err);
      }
    } else if (msg.type === 'export') {
      if (!model) return postMessage({ type: 'error', msg: 'Model not loaded' });
      try {
        await model.save('indexeddb://trendiq-model');
        postMessage({ type: 'status', msg: 'Model saved to IndexedDB' });
      } catch (err) {
        postMessage({ type: 'error', msg: 'Save failed' });
      }
    } else if (msg.type === 'status-check') {
      const readyState = model ? 'Model ready' : 'Model not loaded';
      postMessage({ type: 'status', msg: readyState });
    }
  } catch (err) {
    console.error(err);
    postMessage({ type: 'error', msg: err.message || String(err) });
  }
};