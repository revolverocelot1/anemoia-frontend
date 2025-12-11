// src/workers/depth.worker.ts -> MINIMAL WASM-ONLY VERSION
import { env, pipeline } from '@xenova/transformers';

// Configure transformers.js for browser WASM in a worker
const wasmBasePath = `${self.location.origin}/ort-wasm/`;
env.allowLocalModels = false;
env.allowRemoteModels = true;
env.backends.onnx.wasm = {
    ...(env.backends.onnx.wasm || {}),
    wasmPaths: wasmBasePath,
    // Keep the worker light so it does not saturate the CPU
    numThreads: 1,
    simd: true,
};

let depthEstimator: any = null;

// Simple message handler
self.onmessage = async (event) => {
    const { command, imageData } = event.data;

    if (command !== 'generate') {
        return;
    }

    if (!imageData || typeof imageData.width !== 'number' || typeof imageData.height !== 'number') {
        self.postMessage({
            status: 'error',
            error: 'No image data provided',
        });
        return;
    }

    try {
        if (!depthEstimator) {
            self.postMessage({ status: 'loading_model', message: 'Loading AI engine...' });

            // Xenova pipeline works inside web workers without DOM APIs
            depthEstimator = await pipeline(
                'depth-estimation',
                'onnx-community/depth-anything-v2-small',
            );

            self.postMessage({ status: 'model_ready', message: 'Engine Ready' });
        }

        self.postMessage({ status: 'processing', message: 'Analyzing image...' });

        // Ensure the payload is a real ImageData instance (structured clone can strip prototype)
        const width = (imageData as any)?.width;
        const height = (imageData as any)?.height;
        const dataArray = (imageData as any)?.data;
        const preparedImageData =
            imageData instanceof ImageData && dataArray instanceof Uint8ClampedArray
                ? imageData
                : new ImageData(
                    dataArray instanceof Uint8ClampedArray
                        ? dataArray
                        : new Uint8ClampedArray(dataArray || []),
                    width,
                    height,
                );

        // #region agent log
        emitDebugLog('H1', 'depth.worker.ts:input_check', 'Prepared image data', {
            width: preparedImageData.width,
            height: preparedImageData.height,
            hasData: !!preparedImageData.data,
            dataLength: preparedImageData.data?.length,
            instance: preparedImageData instanceof ImageData,
            ctor: (preparedImageData as any)?.constructor?.name,
        });
        // #endregion

        // Run depth estimation directly on ImageData to avoid DOM dependencies
        const result = await depthEstimator(preparedImageData);
        if (!result || !result.depth) {
            throw new Error('Invalid result from depth estimation');
        }

        const { data: depthData, width, height } = result.depth;

        // Convert depth data to image
        const depthArray = Array.from(depthData as Float32Array);

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
            imageData2[idx] = value; // R
            imageData2[idx + 1] = value; // G
            imageData2[idx + 2] = value; // B
            imageData2[idx + 3] = 255; // A
        }

        // Create output canvas for PNG serialization
        const outputCanvas = new OffscreenCanvas(width, height);
        const outputCtx = outputCanvas.getContext('2d');

        if (!outputCtx) {
            throw new Error('Failed to get output context');
        }

        const outputImageData = new ImageData(imageData2, width, height);
        outputCtx.putImageData(outputImageData, 0, 0);

        const outputBlob = await outputCanvas.convertToBlob({ type: 'image/png' });
        const arrayBuffer = await outputBlob.arrayBuffer();

        // Normalized depth (0..1)
        const normalizedDepth = new Float32Array(depthArray.length);
        for (let i = 0; i < depthArray.length; i++) {
            normalizedDepth[i] = range > 0 ? (depthArray[i] - min) / range : 0;
        }

        const grayRgba = imageData2; // Uint8ClampedArray length width*height*4

        self.postMessage(
            {
                status: 'complete',
                output: arrayBuffer,
                width,
                height,
                normalizedDepth,
                grayRgba,
            },
            [arrayBuffer, normalizedDepth.buffer, grayRgba.buffer],
        );
    } catch (error: any) {
        console.error('[DepthWorker] Error:', error);
        self.postMessage({
            status: 'error',
            error: error?.message || 'Unknown error occurred',
        });
    }
};