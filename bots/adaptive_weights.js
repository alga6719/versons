/* bots/adaptive_weights.js
   TF.js Web Worker — loads model from indexeddb if present (indexeddb://trendiq-model)
   Fallback to /model/model.json (bundled pretrained model).
   Supports messages:
    - {type: 'init'}
    - {type: 'predict', id, features: [...]}
    - {type: 'record', experiences: [{x: [...], y: number}, ...]}
    - {type: 'train'}
    - {type: 'save'}
   Keeps an in-memory experience buffer and performs light retraining.
*/

self.experienceBuffer = [];
self.MAX_BUFFER = 2000;
self.model = null;

async function importTf() {
  try {
    // Prefer local tf.min.js (for extension packaging)
    importScripts('tf.min.js');
    if (!self.tf) throw new Error('tf not found after importScripts');
    console.log('[worker] loaded local tf.min.js');
  } catch (err) {
    console.warn('[worker] failed to load local tf.min.js, falling back to CDN', err);
    // Fallback to CDN if local copy not available
    importScripts('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.7.0/dist/tf.min.js');
    console.log('[worker] loaded tfjs from CDN');
  }
}

async function loadModel() {
  await importTf();
  const tf = self.tf;
  // Try IndexedDB first
  try {
    console.log('[worker] attempting to load model from IndexedDB...');
    self.model = await tf.loadLayersModel('indexeddb://trendiq-model');
    console.log('[worker] loaded model from indexeddb://trendiq-model');
  } catch (e) {
    console.warn('[worker] no model in IndexedDB, trying /model/model.json', e);
    try {
      self.model = await tf.loadLayersModel('/model/model.json');
      console.log('[worker] loaded model from /model/model.json');
    } catch (err) {
      console.error('[worker] failed to load fallback model', err);
      // If no model available, create a small default model
      const model = tf.sequential();
      model.add(tf.layers.dense({units: 32, activation: 'relu', inputShape: [2]}));
      model.add(tf.layers.dense({units: 16, activation: 'relu'}));
      model.add(tf.layers.dense({units: 1, activation: 'linear'}));
      model.compile({optimizer: tf.train.adam(0.001), loss: 'meanSquaredError'});
      self.model = model;
      console.log('[worker] created default model');
    }
  }

  // Ensure compiled for training
  try {
    self.model.compile({optimizer: tf.train.adam(0.001), loss: 'meanSquaredError'});
  } catch (e) {
    // Some loaded models have compile info; ignore compile errors
  }
}

function capBuffer() {
  if (self.experienceBuffer.length > self.MAX_BUFFER) {
    self.experienceBuffer = self.experienceBuffer.slice(-self.MAX_BUFFER);
  }
}

self.onmessage = async (event) => {
  const msg = event.data;
  const tf = self.tf;
  switch (msg.type) {
    case 'init':
      try {
        await loadModel();
        self.postMessage({type: 'inited'});
      } catch (err) {
        self.postMessage({type: 'error', message: String(err)});
      }
      break;

    case 'predict':
      try {
        if (!self.model) {
          await loadModel();
        }
        // features expected to be a flat number array
        const features = msg.features || [];
        // Ensure feature vector length of 2 (fallback pad)
        const padFeatures = features.slice(0, 2);
        while (padFeatures.length < 2) padFeatures.push(0);
        const t = tf.tensor2d([padFeatures]);
        const out = self.model.predict(t);
        const arr = await out.data();
        t.dispose();
        try { out.dispose && out.dispose(); } catch(e){}
        const value = arr[0];
        self.postMessage({type: 'predict_result', id: msg.id, prediction: value});
      } catch (err) {
        self.postMessage({type: 'error', message: String(err)});
      }
      break;

    case 'record':
      try {
        const exps = Array.isArray(msg.experiences) ? msg.experiences : [];
        for (const e of exps) {
          // Expect each e = { x: [...], y: number }
          if (!Array.isArray(e.x) || typeof e.y !== 'number') continue;
          self.experienceBuffer.push({x: e.x.slice(0, 2), y: e.y});
        }
        capBuffer();
        self.postMessage({type: 'recorded', added: exps.length, total: self.experienceBuffer.length});
      } catch (err) {
        self.postMessage({type: 'error', message: String(err)});
      }
      break;

    case 'train':
      try {
        if (!self.model) {
          await loadModel();
        }
        if (self.experienceBuffer.length < 8) {
          self.postMessage({type: 'train_skipped', reason: 'not enough experiences', total: self.experienceBuffer.length});
          break;
        }
        // Prepare tensors
        const xs = tf.tensor2d(self.experienceBuffer.map(e => {
          const a = e.x.slice(0,2);
          while (a.length < 2) a.push(0);
          return a;
        }));
        const ys = tf.tensor2d(self.experienceBuffer.map(e => [e.y]));
        const epochs = Math.min(10, Math.max(1, Math.floor(self.experienceBuffer.length / 50)));
        self.postMessage({type: 'train_start', examples: self.experienceBuffer.length, epochs});
        await self.model.fit(xs, ys, {
          epochs,
          batchSize: 16,
          callbacks: {
            onEpochEnd: (epoch, logs) => {
              self.postMessage({type: 'train_epoch_end', epoch, logs});
            }
          }
        });
        xs.dispose();
        ys.dispose();
        // Optionally save after training
        try {
          await self.model.save('indexeddb://trendiq-model');
          self.postMessage({type: 'trained_saved'});
        } catch (err) {
          console.warn('[worker] failed to save to IndexedDB', err);
          self.postMessage({type: 'trained_nosave', error: String(err)});
        }
        self.postMessage({type: 'train_done'});
      } catch (err) {
        self.postMessage({type: 'error', message: String(err)});
      }
      break;

    case 'save':
      try {
        if (!self.model) {
          await loadModel();
        }
        await self.model.save('indexeddb://trendiq-model');
        self.postMessage({type: 'saved'});
      } catch (err) {
        self.postMessage({type: 'error', message: String(err)});
      }
      break;

    default:
      self.postMessage({type: 'error', message: 'unknown message type ' + String(msg.type)});
  }
};
