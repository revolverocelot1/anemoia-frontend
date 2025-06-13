// src/workers/pose.worker.ts - MoveNet Lightning (WASM backend)
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-wasm';
import * as posedetection from '@tensorflow-models/pose-detection';

// Configure WASM path dynamically via CDN fallback
(tf as any).env().set('WASM_HAS_SIMD_SUPPORT', true);
(tf as any).env().set('WASM_HAS_MULTITHREAD_SUPPORT', true);

let detector: posedetection.PoseDetector | null = null;
let ready = false;

async function initModel() {
  if (ready) return;
  await tf.setBackend('wasm');
  await tf.ready();
  detector = await posedetection.createDetector(posedetection.SupportedModels.MoveNet, {
    modelType: 'lightning',
    enableSmoothing: true,
    wasmPaths: 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs-backend-wasm@4.9.0/dist/',
  } as any);
  ready = true;
}

self.onmessage = async (e) => {
  const { command, imageData } = e.data;
  if (command !== 'estimate' || !imageData) return;

  try {
    if (!ready) {
      self.postMessage({ status: 'loading_model' });
      await initModel();
      self.postMessage({ status: 'model_ready' });
    }

    self.postMessage({ status: 'processing' });

    const imgTensor = tf.browser.fromPixels(imageData as ImageData);
    const poses = await detector!.estimatePoses(imgTensor as any, { flipHorizontal: false });
    imgTensor.dispose();

    self.postMessage({ status: 'complete', poses });
  } catch (err: any) {
    self.postMessage({ status: 'error', error: err.message || 'Pose worker error' });
  }
}; 