// src/workers/depth.worker.ts -> MINIMAL WASM-ONLY VERSION
import { pipeline, env } from '@huggingface/transformers';

// Configure transformers.js to use WASM backend only
env.allowLocalModels = false;
env.allowRemoteModels = true;

// Force WASM backend configuration
env.backends = {
    onnx: {
        wasm: {
            numThreads: 1,
            simd: true
        }
    }
};

let depthEstimator: any = null;
let isInitialized = false;

// Simple message handler
self.onmessage = async (event) => {
    const { command, imageData } = event.data;

    if (command !== 'generate') {
        return;
    }

    if (!imageData) {
        self.postMessage({
            status: 'error',
            error: 'No image data provided'
        });
        return;
    }

    try {
        // Initialize model only once
        if (!isInitialized) {
            self.postMessage({ status: 'loading_model', message: 'Loading AI engine...' });
            
            // Simple pipeline configuration with WASM backend
            depthEstimator = await pipeline(
                'depth-estimation', 
                'onnx-community/depth-anything-v2-small',
                {
                    dtype: 'q8',
                    device: 'wasm'
                }
            );
            isInitialized = true;
            
            self.postMessage({ status: 'model_ready', message: 'Engine Ready' });
        }

        self.postMessage({ status: 'processing', message: 'Analyzing image...' });
        
        // Convert ImageData to canvas and then to data URL
        const canvas = new OffscreenCanvas(imageData.width, imageData.height);
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
            throw new Error('Failed to get 2D context');
        }
        
        ctx.putImageData(imageData, 0, 0);
        
        // Convert to blob and create URL
        const blob = await canvas.convertToBlob({ type: 'image/png' });
        const imageUrl = URL.createObjectURL(blob);
        
        try {
            // Run depth estimation
            const result = await depthEstimator(imageUrl);
            
            if (!result || !result.depth) {
                throw new Error('Invalid result from depth estimation');
            }
            
            const { data: depthData, width, height } = result.depth;
            
            // Convert depth data to image
            const depthArray = Array.from(depthData as Float32Array);
            
            // Compute min and max without using spread to avoid call-stack overflow on large arrays
            let min = Number.POSITIVE_INFINITY;
            let max = Number.NEGATIVE_INFINITY;
            for (let i = 0; i < depthArray.length; i++) {
                const v = depthArray[i];
                if (v < min) min = v;
                if (v > max) max = v;
            }
            
            const range = max - min;
            
            const imageData2 = new Uint8ClampedArray(width * height * 4);
            for (let i = 0; i < depthArray.length; i++) {
                const value = range > 0 ? Math.round(255 * (depthArray[i] - min) / range) : 0;
                const idx = i * 4;
                imageData2[idx] = value;     // R
                imageData2[idx + 1] = value; // G
                imageData2[idx + 2] = value; // B
                imageData2[idx + 3] = 255;   // A
            }
            
            // Create output canvas
            const outputCanvas = new OffscreenCanvas(width, height);
            const outputCtx = outputCanvas.getContext('2d');
            
            if (!outputCtx) {
                throw new Error('Failed to get output context');
            }
            
            const outputImageData = new ImageData(imageData2, width, height);
            outputCtx.putImageData(outputImageData, 0, 0);
            
            const outputBlob = await outputCanvas.convertToBlob({ type: 'image/png' });
            const arrayBuffer = await outputBlob.arrayBuffer();
            
            self.postMessage({
                status: 'complete',
                output: arrayBuffer,
                width,
                height
            });
            
        } finally {
            URL.revokeObjectURL(imageUrl);
        }
        
    } catch (error: any) {
        console.error('[Worker] Error:', error);
        self.postMessage({
            status: 'error',
            error: error.message || 'Unknown error occurred'
        });
    }
};