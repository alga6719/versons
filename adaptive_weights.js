/*
TrendIQ v4.2 ML Loader — TF.js Worker
Loads a pretrained model from /model/model.json instead of using CDN.
*/

importScripts('tf.min.js'); // <-- Local TensorFlow.js runtime (must be placed in extension folder)

let model = null;
const FEATURE_KEYS = ['slope', 'volSpike', 'obImb', 'recentVolMean', 'lastClose'];

async function loadPretrainedModel() {
  try {
    model = await tf.loadLayersModel('model/model.json');
    postMessage({ type: 'status', msg: 'Pretrained model loaded' });
  } catch (e) {
    console.error('Model loading failed', e);
    postMessage({ type: 'error', msg: 'Failed to load pretrained model' });
  }
}

onmessage = async function (e) {
  const msg = e.data;
  if (msg.type === 'init') {
    await loadPretrainedModel();
  } else if (msg.type === 'predict') {
    if (!model) return postMessage({ type: 'error', msg: 'Model not loaded' });
    const input = FEATURE_KEYS.map(k => msg.features[k] || 0);
    const tensor = tf.tensor2d([input]);
    const pred = model.predict(tensor);
    const score = (await pred.data())[0];
    postMessage({ type: 'prediction', score });
  }
};