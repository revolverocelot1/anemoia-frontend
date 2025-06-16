// src/workers/upscaler.worker.ts
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import '@tensorflow/tfjs-backend-webgpu';

self.onmessage = async (event: MessageEvent<any>) => {
  const { command, imageData, scaleFactor, backend } = event.data; // modelBasePath removed, backend added

  if (command === 'initialize') {
    // Optional: Pre-load backend or perform other setup
    // For now, backend is set per 'upscale' command
    self.postMessage({ status: 'worker_initialized', message: 'Upscaler worker initialized.' });
  } else if (command === 'upscale') {
    if (!imageData || !scaleFactor) {
      self.postMessage({ status: 'error', error: 'Missing image data or scale factor in worker.' });
      return;
    }

    let model_url: string;
    let model_name_for_db: string; // For IndexedDB key

    if (scaleFactor === 4) {
      const modelInternalName = "general_plus_64"; // Simplified, tile size assumed by model name
      model_name_for_db = `realesrgan_x4_${modelInternalName}`;
      model_url = `/models/upscaler/realesrgan_x4_${modelInternalName}/model.json`;
      self.postMessage({ status: 'model_loading', message: `Loading Real-ESRGAN 4x (${modelInternalName}) model...` });
    } else if (scaleFactor === 2) {
      const modelInternalName = "conservative_64"; // Simplified
      model_name_for_db = `realcugan_x2_${modelInternalName}`;
      model_url = `/models/upscaler/realcugan_x2_${modelInternalName}/model.json`;
      self.postMessage({ status: 'model_loading', message: `Loading Real-CUGAN 2x (${modelInternalName}) model...` });
    } else {
      self.postMessage({ status: 'error', error: `Scale factor ${scaleFactor}x not supported.` });
      return;
    }

    const currentBackend = backend || 'webgl';
    self.postMessage({ status: 'info', message: `Attempting to set backend to: ${currentBackend}` });
    console.log("Available TFJS backends before setBackend:", Object.keys(tf.engine().registryFactory));
    self.postMessage({ status: 'info', message: `Available backends before set: ${Object.keys(tf.engine().registryFactory).join(', ')}` });

    try {
      await tf.env().setBackend(currentBackend); // Use tf.env()

      // Verify if backend was set
      const actualBackend = tf.env().getBackend();
      console.log(`TF.js backend set to: ${actualBackend}`);

      if (actualBackend !== currentBackend) {
        // Fallback or error if desired backend couldn't be set
        console.warn(`Failed to set backend to ${currentBackend}. Actual backend: ${actualBackend}. Attempting to set again or falling back to webgl if different.`);
        // Optionally, try to set to webgl if currentBackend !== 'webgl' and failed
        if (currentBackend !== 'webgl') {
            await tf.env().setBackend('webgl');
            const fallbackBackend = tf.env().getBackend();
            console.log(`Fell back to webgl. Actual backend: ${fallbackBackend}`);
            if (fallbackBackend !== 'webgl') {
                 throw new Error(`Failed to set backend to ${currentBackend} or fallback webgl. Current is ${fallbackBackend}`);
            }
        } else {
            throw new Error(`Failed to set backend to ${currentBackend}. Current is ${actualBackend}`);
        }
      }
      self.postMessage({ status: 'info', message: `TF.js backend successfully set to: ${tf.env().getBackend()}` });

      await tf.ready();
      self.postMessage({ status: 'info', message: 'TF.js backend is ready.' });

    } catch (e) {
      console.error(`Error setting backend or backend not ready:`, e);
      self.postMessage({
        status: 'error',
        error: `Failed to set TF.js backend to ${currentBackend}: ${(e as Error).message}. Available: ${Object.keys(tf.engine().registryFactory).join(', ')}`,
      });
      return; // Stop if backend can't be set
    }
    // ... rest of model loading ...
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

    // Placeholder for actual upscaling logic using the loaded 'model'
    self.postMessage({ status: 'processing', message: 'Simulating image upscaling...' });
    await new Promise(resolve => setTimeout(resolve, 2000)); // Simulate processing

    // Placeholder for result
    const upscaledDataUrl = `https://via.placeholder.com/800x600.png?text=Upscaled+${scaleFactor}x+(Simulated)`;
    const stats = {
      originalWidth: imageData.width || 0,
      originalHeight: imageData.height || 0,
      upscaledWidth: (imageData.width || 200) * scaleFactor,
      upscaledHeight: (imageData.height || 150) * scaleFactor,
      processingTime: 2.0, // This would be measured in actual processing
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

// Optional: Add a handler for unhandled rejections and errors within the worker
self.addEventListener('unhandledrejection', event => {
  console.error('Unhandled rejection in worker:', event.reason);
  self.postMessage({ status: 'error', error: `Unhandled rejection: ${event.reason}` });
});

self.addEventListener('error', event => {
  console.error('Error in worker:', event.message);
  self.postMessage({ status: 'error', error: `Worker error: ${event.message}` });
});
