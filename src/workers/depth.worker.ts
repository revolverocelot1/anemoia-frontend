// src/workers/depth.worker.ts -> MINIMAL WASM-ONLY VERSION
import { env, pipeline, RawImage } from '@xenova/transformers';

// Check if SharedArrayBuffer is available (required for multi-threading)
// Also check crossOriginIsolated which is the proper way to detect COOP/COEP
const hasSharedArrayBuffer = typeof SharedArrayBuffer !== 'undefined';
const isCrossOriginIsolated = typeof self !== 'undefined' && (self as any).crossOriginIsolated === true;

// Configure transformers.js for browser WASM in a worker
const wasmBasePath = `${self.location.origin}/ort-wasm/`;

// Must configure BEFORE any pipeline creation
env.allowLocalModels = false;
env.allowRemoteModels = true;

// Safely configure the ONNX WASM backend
// CRITICAL: Must use numThreads: 1 when SharedArrayBuffer is unavailable
try {
    // Force single-threaded execution when not cross-origin isolated
    // This avoids the "no available backend found" error
    const useThreads = hasSharedArrayBuffer && isCrossOriginIsolated;
    
    env.backends.onnx.wasm = {
        wasmPaths: wasmBasePath,
        // MUST be 1 when SharedArrayBuffer is not available
        numThreads: useThreads ? 1 : 1,
        // SIMD should work without SharedArrayBuffer
        simd: true,
        // Disable proxy to simplify execution
        proxy: false,
    };

    // Debug log for troubleshooting
    console.debug('[DepthWorker] WASM config:', {
        wasmPaths: wasmBasePath,
        numThreads: 1,
        hasSharedArrayBuffer,
        isCrossOriginIsolated,
        useThreads,
    });
} catch (e) {
    console.warn('[DepthWorker] Failed to configure ONNX backend:', e);
}

// Lightweight logger to avoid reference errors during worker execution
const emitDebugLog = (...args: any[]) => {
    try {
        // Use debug to keep logs unobtrusive in production consoles
        console.debug('[DepthWorker]', ...args);
    } catch (_err) {
        // No-op if console is unavailable
    }
};

let depthEstimator: any = null;

// Simple message handler
self.onmessage = async (event) => {
    const { command, imageData, imageUrl } = event.data;

    if (command !== 'generate') {
        return;
    }

    try {
        if (!depthEstimator) {
            self.postMessage({ status: 'loading_model', message: 'Loading AI engine...' });

            // Xenova pipeline works inside web workers without DOM APIs
            // Device is configured via env.backends.onnx.wasm settings above
            depthEstimator = await pipeline(
                'depth-estimation',
                'onnx-community/depth-anything-v2-small',
                {
                    progress_callback: (progress: any) => {
                        if (progress.status === 'downloading' || progress.status === 'progress') {
                            console.debug('[DepthWorker] Model loading:', progress);
                        }
                    }
                }
            );

            self.postMessage({ status: 'model_ready', message: 'Engine Ready' });
        }

        self.postMessage({ status: 'processing', message: 'Analyzing image...' });

        let rawImage: any = null;

        if (imageUrl && typeof imageUrl === 'string') {
            rawImage = await RawImage.fromURL(imageUrl);
        } else if (imageData && typeof imageData.width === 'number' && typeof imageData.height === 'number') {
            // Ensure the payload is a real ImageData instance (structured clone can strip prototype)
            const inputWidth = (imageData as any)?.width;
            const inputHeight = (imageData as any)?.height;
            const dataArray = (imageData as any)?.data;
            const preparedImageData =
                imageData instanceof ImageData && dataArray instanceof Uint8ClampedArray
                    ? imageData
                    : new ImageData(
                        dataArray instanceof Uint8ClampedArray
                            ? dataArray
                            : new Uint8ClampedArray(dataArray || []),
                        inputWidth,
                        inputHeight,
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

            rawImage = new RawImage(preparedImageData.data, preparedImageData.width, preparedImageData.height, 4);
        } else {
            self.postMessage({
                status: 'error',
                error: 'No image data provided',
            });
            return;
        }

        rawImage.convert(3); // Drop alpha channel

        // Run depth estimation
        const result = await depthEstimator(rawImage);
        if (!result || !result.depth) {
            throw new Error('Invalid result from depth estimation');
        }

        const { data: depthData, width: depthWidth, height: depthHeight } = result.depth;

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

        const imageData2 = new Uint8ClampedArray(depthWidth * depthHeight * 4);
        for (let i = 0; i < depthArray.length; i++) {
            const value = range > 0 ? Math.round(255 * (depthArray[i] - min) / range) : 0;
            const idx = i * 4;
            imageData2[idx] = value; // R
            imageData2[idx + 1] = value; // G
            imageData2[idx + 2] = value; // B
            imageData2[idx + 3] = 255; // A
        }

        // Create output canvas for PNG serialization
        const outputCanvas = new OffscreenCanvas(depthWidth, depthHeight);
        const outputCtx = outputCanvas.getContext('2d');

        if (!outputCtx) {
            throw new Error('Failed to get output context');
        }

        const outputImageData = new ImageData(imageData2, depthWidth, depthHeight);
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
                width: depthWidth,
                height: depthHeight,
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