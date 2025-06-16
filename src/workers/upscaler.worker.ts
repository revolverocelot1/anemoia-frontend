// src/workers/upscaler.worker.ts
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-webgpu';

console.log('Worker script started. TFJS Loaded:', tf);
console.log('tf.engine (should be object):', tf.engine);
console.log('tf.env (should be object):', tf.env);
console.log('tf.ready (should be function):', tf.ready);
console.log('tf.setBackend (should be function):', tf.setBackend);
console.log('tf.getBackend (should be function):', tf.getBackend);

if (tf.engine && typeof tf.engine === 'object' && tf.engine.registryFactory) { // Check if engine is an object as per new findings
    console.log('Available TFJS backends (from worker start - direct engine):', Object.keys(tf.engine.registryFactory));
} else if (tf.engine && typeof tf.engine === 'function' && tf.engine().registryFactory) { // Original check
    console.log('Available TFJS backends (from worker start - engine as function):', Object.keys(tf.engine().registryFactory));
} else {
    console.log('tf.engine or tf.engine().registryFactory is not available at worker start as expected.');
}


self.onmessage = async (event: MessageEvent<any>) => {
  const { command, imageData, scaleFactor, backend } = event.data;

  if (command === 'initialize') {
    self.postMessage({ status: 'worker_initialized', message: 'Upscaler worker initialized.' });
  } else if (command === 'upscale') {
    if (!imageData || !scaleFactor) {
      self.postMessage({ status: 'error', error: 'Missing image data or scale factor in worker.' });
      return;
    }

    let model_url: string;
    let model_name_for_db: string;

    if (scaleFactor === 4) {
      const modelInternalName = "general_plus_64";
      model_name_for_db = `realesrgan_x4_${modelInternalName}`;
      model_url = `/models/upscaler/realesrgan_x4_${modelInternalName}/model.json`;
      self.postMessage({ status: 'model_loading', message: `Loading Real-ESRGAN 4x (${modelInternalName}) model...` });
    } else if (scaleFactor === 2) {
      const modelInternalName = "conservative_64";
      model_name_for_db = `realcugan_x2_${modelInternalName}`;
      model_url = `/models/upscaler/realcugan_x2_${modelInternalName}/model.json`;
      self.postMessage({ status: 'model_loading', message: `Loading Real-CUGAN 2x (${modelInternalName}) model...` });
    } else {
      self.postMessage({ status: 'error', error: `Scale factor ${scaleFactor}x not supported.` });
      return;
    }

    const currentBackend = backend || 'webgl';
    self.postMessage({ status: 'info', message: `Attempting to set backend to: ${currentBackend}` });

    // Diagnostic log for available backends
    let availableBackendsDiag = "N/A";
    if (tf.engine && typeof tf.engine === 'object' && tf.engine.registryFactory) {
        availableBackendsDiag = Object.keys(tf.engine.registryFactory).join(', ');
    } else if (tf.engine && typeof tf.engine === 'function' && tf.engine().registryFactory) {
        availableBackendsDiag = Object.keys(tf.engine().registryFactory).join(', ');
    }
    self.postMessage({ status: 'info', message: `Available backends before set: ${availableBackendsDiag}` });


    try {
      const backendSetSuccessfully = await tf.setBackend(currentBackend); // Reverted to direct tf.setBackend
      if (!backendSetSuccessfully) {
          // This path might not be typically hit if setBackend throws on failure for unsupported backends.
          throw new Error(`tf.setBackend reported failure for ${currentBackend} (returned false).`);
      }

      const actualBackend = tf.getBackend(); // Reverted to direct tf.getBackend
      console.log(`TF.js backend set to: ${actualBackend}`);

      if (actualBackend !== currentBackend) {
        console.warn(`Failed to set backend to ${currentBackend}. Actual backend: ${actualBackend}. Attempting to fall back to webgl.`);
        if (currentBackend !== 'webgl') { // Only attempt fallback if original request wasn't webgl
            const webglSet = await tf.setBackend('webgl');
             if(!webglSet) throw new Error(`Fallback to webgl also failed via tf.setBackend (returned false). Current is ${tf.getBackend()}`);
            const fallbackBackend = tf.getBackend();
            console.log(`Fell back to webgl. Actual backend: ${fallbackBackend}`);
            if (fallbackBackend !== 'webgl') { // If even webgl couldn't be set
                 throw new Error(`Failed to set backend to ${currentBackend} or fallback to webgl. Current is ${fallbackBackend}`);
            }
        } else { // Original request was webgl and it wasn't set
            throw new Error(`Failed to set backend to ${currentBackend}. Current is ${actualBackend}`);
        }
      }
      self.postMessage({ status: 'info', message: `TF.js backend successfully set to: ${tf.getBackend()}` });

      await tf.ready();
      self.postMessage({ status: 'info', message: 'TF.js backend is ready.' });

    } catch (e) {
      console.error(`Error setting backend or backend not ready:`, e);
      let availableBackendsMsg = "N/A";
      if (tf.engine && typeof tf.engine === 'object' && tf.engine.registryFactory) {
        availableBackendsMsg = Object.keys(tf.engine.registryFactory).join(', ');
      } else if (tf.engine && typeof tf.engine === 'function' && tf.engine().registryFactory) {
         availableBackendsMsg = Object.keys(tf.engine().registryFactory).join(', ');
      }
      self.postMessage({
        status: 'error',
        error: `Failed to set TF.js backend to ${currentBackend}: ${(e as Error).message}. Available: ${availableBackendsMsg}`,
      });
      return;
    }

    let model;
    try {
      console.log(`Attempting to load model from IndexedDB: indexeddb://${model_name_for_db}`);
      model = await tf.loadGraphModel(`indexeddb://${model_name_for_db}`);
      console.log(`Model ${model_name_for_db} loaded from IndexedDB`);
      self.postMessage({ status: 'model_ready', message: 'Model loaded from cache.' });
    } catch (error) {
      console.log(`Loading model ${model_name_for_db} from URL: ${model_url}`);
      self.postMessage({ status: 'model_loading', message: `Downloading ${model_name_for_db} model... (this may take a moment)` });
      try {
        model = await tf.loadGraphModel(model_url);
        await model.save(`indexeddb://${model_name_for_db}`);
        console.log(`Model ${model_name_for_db} loaded and cached.`);
        self.postMessage({ status: 'model_ready', message: 'Model downloaded and ready.' });
      } catch (e) {
        console.error(`Error loading model ${model_name_for_db} from URL: `, e);
        self.postMessage({ status: 'error', error: `Failed to load model from ${model_url}: ${(e as Error).message}` });
        return;
      }
    }

    if (!model) {
      self.postMessage({ status: 'error', error: 'Model could not be loaded.'});
      return;
    }

    self.postMessage({ status: 'processing', message: 'Simulating image upscaling...' });
    await new Promise(resolve => setTimeout(resolve, 2000));

    const upscaledDataUrl = `https://via.placeholder.com/800x600.png?text=Upscaled+${scaleFactor}x+(Simulated)`;
    const stats = {
      originalWidth: imageData.width || 0,
      originalHeight: imageData.height || 0,
      upscaledWidth: (imageData.width || 200) * scaleFactor,
      upscaledHeight: (imageData.height || 150) * scaleFactor,
      processingTime: 2.0,
      scaleFactor: scaleFactor,
      modelName: model_name_for_db,
    };

    self.postMessage({
      status: 'complete',
      upscaledImageUrl: upscaledDataUrl,
      stats: stats,
    });
  }
};

self.addEventListener('unhandledrejection', event => {
  console.error('Unhandled rejection in worker:', event.reason);
  self.postMessage({ status: 'error', error: `Unhandled rejection: ${event.reason}` });
});

self.addEventListener('error', event => {
  console.error('Error in worker:', event.message);
  self.postMessage({ status: 'error', error: `Worker error: ${event.message}` });
});
