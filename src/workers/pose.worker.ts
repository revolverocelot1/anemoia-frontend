// src/workers/pose.worker.ts - MoveNet Lightning (CPU backend)
import * as tf from '@tensorflow/tfjs-core';
import '@tensorflow/tfjs-backend-cpu';
import * as posedetection from '@tensorflow-models/pose-detection';

let detector: any = null;
let ready = false;

async function initModel() {
  if (ready) return;
  
  // Use CPU backend to avoid SharedArrayBuffer issues
  await tf.setBackend('cpu');
  await tf.ready();
  
  detector = await posedetection.createDetector(posedetection.SupportedModels.MoveNet, {
    // Use the multi-person lightning variant so we can detect several people in one image
    modelType: posedetection.movenet.modelType.MULTIPOSE_LIGHTNING,
    enableSmoothing: true,
    modelUrl: undefined, // Let it use the default TensorFlow Hub URL
  });
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