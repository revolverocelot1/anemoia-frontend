/**
 * SHARP Depth Worker - Neural depth estimation for 3D Gaussian Splat generation
 * 
 * Uses Depth Anything V2 (via @xenova/transformers) to produce proper neural depth maps
 * that are then used to generate high-quality 3D Gaussian Splats.
 * 
 * This runs entirely on the user's device using WASM/WebGPU.
 */
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
    // Only use multiple threads if both SharedArrayBuffer and crossOriginIsolated are available
    const canUseThreads = hasSharedArrayBuffer && isCrossOriginIsolated;
    const numThreads = canUseThreads 
        ? Math.min(navigator.hardwareConcurrency || 2, 4) 
        : 1;

    env.backends.onnx.wasm = {
        wasmPaths: wasmBasePath,
        numThreads,
        // SIMD should work without SharedArrayBuffer
        simd: true,
        // Disable proxy to simplify execution
        proxy: false,
    };

    console.debug('[SharpDepthWorker] WASM config:', {
        wasmPaths: wasmBasePath,
        numThreads,
        hasSharedArrayBuffer,
        isCrossOriginIsolated,
        canUseThreads,
        hardwareConcurrency: navigator.hardwareConcurrency,
    });
} catch (e) {
    console.warn('[SharpDepthWorker] Failed to configure ONNX backend:', e);
}

const log = (...args: any[]) => {
    try {
        console.debug('[SharpDepthWorker]', ...args);
    } catch (_) {}
};

let depthEstimator: any = null;
let modelLoadPromise: Promise<any> | null = null;

// SH degree-0 coefficient
const SH_C0 = 0.28209479177387814;

interface SharpWorkerMessage {
    command: 'generate' | 'preload';
    imageData?: ImageData;
    imageUrl?: string;
    gridSize?: number;
    depthScale?: number;
    focalLengthPx?: number;
}

interface GeneratedPlyResult {
    plyBuffer: ArrayBuffer;
    metadata: {
        gaussianCount: number;
        depthWidth: number;
        depthHeight: number;
        minDepth: number;
        maxDepth: number;
    };
}

/**
 * Load the depth estimation model (cached after first load)
 */
async function loadModel(): Promise<any> {
    if (depthEstimator) return depthEstimator;
    
    if (modelLoadPromise) return modelLoadPromise;
    
    modelLoadPromise = (async () => {
        self.postMessage({ status: 'loading_model', progress: 0, message: 'Loading Depth Anything V2 neural network...' });
        
        // Device is configured via env.backends.onnx.wasm settings above
        depthEstimator = await pipeline(
            'depth-estimation',
            'onnx-community/depth-anything-v2-small',
            {
                progress_callback: (progress: any) => {
                    if (progress.status === 'downloading' || progress.status === 'progress') {
                        const pct = progress.progress ? Math.round(progress.progress) : 0;
                        self.postMessage({ status: 'loading_model', progress: pct / 10, message: `Loading model: ${pct}%` });
                    }
                }
            }
        );
        
        self.postMessage({ status: 'model_ready', progress: 10, message: 'Neural depth model loaded' });
        return depthEstimator;
    })();
    
    return modelLoadPromise;
}

/**
 * Estimate depth from image using neural network
 */
async function estimateNeuralDepth(rawImage: any): Promise<{ depth: Float32Array; width: number; height: number }> {
    const estimator = await loadModel();
    
    self.postMessage({ status: 'processing', progress: 20, message: 'Running neural depth estimation...' });
    
    // Convert to RGB (drop alpha)
    rawImage.convert(3);
    
    const result = await estimator(rawImage);
    
    if (!result || !result.depth) {
        throw new Error('Invalid result from depth estimation');
    }
    
    const { data: depthData, width: depthWidth, height: depthHeight } = result.depth;
    
    // Normalize depth to 0-1 range
    // Depth Anything V2 outputs DISPARITY (inverse depth):
    // - Higher raw values = CLOSER to camera
    // - Lower raw values = FARTHER from camera
    // We preserve this: normalized 1 = close, 0 = far
    const depthArray = Array.from(depthData as Float32Array);
    let min = Number.POSITIVE_INFINITY;
    let max = Number.NEGATIVE_INFINITY;
    
    for (const v of depthArray) {
        if (v < min) min = v;
        if (v > max) max = v;
    }
    
    const range = max - min || 1;
    const normalizedDepth = new Float32Array(depthArray.length);
    
    for (let i = 0; i < depthArray.length; i++) {
        // DO NOT INVERT - Depth Anything outputs disparity where high = close
        // Normalized: 1 = closest to camera, 0 = farthest
        normalizedDepth[i] = (depthArray[i] - min) / range;
    }
    
    return {
        depth: normalizedDepth,
        width: depthWidth,
        height: depthHeight,
    };
}

/**
 * Generate SHARP-compatible PLY from image and neural depth
 * 
 * SHARP PLY format (14 floats per vertex):
 * - x, y, z (position)
 * - f_dc_0, f_dc_1, f_dc_2 (SH degree-0 color coefficients)
 * - opacity (logit)
 * - scale_0, scale_1, scale_2 (log scale)
 * - rot_0, rot_1, rot_2, rot_3 (quaternion)
 * 
 * Coordinate system: OpenCV convention (x-right, y-down, z-forward)
 */
function generateSharpPly(
    imageData: ImageData,
    depthData: Float32Array,
    depthWidth: number,
    depthHeight: number,
    gridSize: number,
    depthScale: number = 1.5,
    focalLengthPx?: number
): GeneratedPlyResult {
    const { width: imgWidth, height: imgHeight, data: imgData } = imageData;
    
    // Calculate number of gaussians
    const numPoints = gridSize * gridSize;
    
    // PLY header
    const header = 
`ply
format binary_little_endian 1.0
element vertex ${numPoints}
property float x
property float y
property float z
property float f_dc_0
property float f_dc_1
property float f_dc_2
property float opacity
property float scale_0
property float scale_1
property float scale_2
property float rot_0
property float rot_1
property float rot_2
property float rot_3
end_header
`;

    const headerBytes = new TextEncoder().encode(header);
    const floatsPerPoint = 14;
    const dataBytes = numPoints * floatsPerPoint * 4;
    
    const buffer = new ArrayBuffer(headerBytes.length + dataBytes);
    const view = new DataView(buffer);
    
    // Copy header
    headerBytes.forEach((byte, i) => view.setUint8(i, byte));
    
    let offset = headerBytes.length;
    
    // Scene parameters
    const aspectRatio = imgWidth / imgHeight;
    const sceneWidth = 2.0 * aspectRatio;
    const sceneHeight = 2.0;
    
    // Base distance and depth range for proper 3D placement
    // baseDistance: where the "average" depth plane sits
    // depthRange: how much depth variation (closer objects protrude more)
    const baseDistance = 3.0;
    const depthRange = depthScale * 1.5; // Amplify depth for more pronounced 3D effect
    
    log(`Scene params: width=${sceneWidth.toFixed(2)}, height=${sceneHeight.toFixed(2)}, baseZ=${baseDistance}, depthRange=${depthRange.toFixed(2)}`);
    
    // Splat size calculation for optimal coverage without blur
    // Use tighter spacing (1.05x) for sharper front view, slightly overlapping for coverage
    // Higher grid sizes = smaller splats = sharper image
    const baseSplatSize = (sceneWidth / gridSize) * 1.05;
    
    let minDepth = Infinity, maxDepth = -Infinity;
    
    for (let gy = 0; gy < gridSize; gy++) {
        for (let gx = 0; gx < gridSize; gx++) {
            // Sample from image using bilinear interpolation
            const imgXFloat = (gx / (gridSize - 1)) * (imgWidth - 1);
            const imgYFloat = (gy / (gridSize - 1)) * (imgHeight - 1);
            const imgX = Math.floor(imgXFloat);
            const imgY = Math.floor(imgYFloat);
            const fracX = imgXFloat - imgX;
            const fracY = imgYFloat - imgY;
            
            // Bilinear sampling for color
            const getPixel = (px: number, py: number) => {
                const cx = Math.min(Math.max(px, 0), imgWidth - 1);
                const cy = Math.min(Math.max(py, 0), imgHeight - 1);
                const idx = (cy * imgWidth + cx) * 4;
                return [imgData[idx] / 255, imgData[idx + 1] / 255, imgData[idx + 2] / 255, imgData[idx + 3] / 255];
            };
            
            const p00 = getPixel(imgX, imgY);
            const p10 = getPixel(imgX + 1, imgY);
            const p01 = getPixel(imgX, imgY + 1);
            const p11 = getPixel(imgX + 1, imgY + 1);
            
            const r = (1 - fracX) * (1 - fracY) * p00[0] + fracX * (1 - fracY) * p10[0] + 
                      (1 - fracX) * fracY * p01[0] + fracX * fracY * p11[0];
            const g = (1 - fracX) * (1 - fracY) * p00[1] + fracX * (1 - fracY) * p10[1] + 
                      (1 - fracX) * fracY * p01[1] + fracX * fracY * p11[1];
            const b = (1 - fracX) * (1 - fracY) * p00[2] + fracX * (1 - fracY) * p10[2] + 
                      (1 - fracX) * fracY * p01[2] + fracX * fracY * p11[2];
            const alpha = (1 - fracX) * (1 - fracY) * p00[3] + fracX * (1 - fracY) * p10[3] + 
                          (1 - fracX) * fracY * p01[3] + fracX * fracY * p11[3];
            
            // Sample depth with bilinear interpolation (mapping to depth map coords)
            const depthXFloat = (gx / (gridSize - 1)) * (depthWidth - 1);
            const depthYFloat = (gy / (gridSize - 1)) * (depthHeight - 1);
            const depthX = Math.floor(depthXFloat);
            const depthY = Math.floor(depthYFloat);
            const depthFracX = depthXFloat - depthX;
            const depthFracY = depthYFloat - depthY;
            
            const getDepth = (px: number, py: number) => {
                const cx = Math.min(Math.max(px, 0), depthWidth - 1);
                const cy = Math.min(Math.max(py, 0), depthHeight - 1);
                return depthData[cy * depthWidth + cx];
            };
            
            const d00 = getDepth(depthX, depthY);
            const d10 = getDepth(depthX + 1, depthY);
            const d01 = getDepth(depthX, depthY + 1);
            const d11 = getDepth(depthX + 1, depthY + 1);
            
            const depthValue = (1 - depthFracX) * (1 - depthFracY) * d00 + depthFracX * (1 - depthFracY) * d10 + 
                               (1 - depthFracX) * depthFracY * d01 + depthFracX * depthFracY * d11;
            
            // Track depth stats
            if (depthValue < minDepth) minDepth = depthValue;
            if (depthValue > maxDepth) maxDepth = depthValue;
            
            // --- Position calculation ---
            // X, Y: Normalized screen coordinates (-0.5 to 0.5) scaled to scene size
            const normalizedX = (gx / (gridSize - 1)) - 0.5;
            const normalizedY = (gy / (gridSize - 1)) - 0.5;
            
            const x = normalizedX * sceneWidth;  // Left-right
            const y = normalizedY * sceneHeight; // Top-bottom
            
            // Z: Depth positioning
            // depthValue: 1 = closest to camera, 0 = farthest
            // We want close objects (high depthValue) to have SMALLER Z (nearer to camera at Z=0)
            // Formula: Z = baseDistance - (depthValue * depthRange)
            // - When depthValue = 1 (close): Z = baseDistance - depthRange (small Z, near camera)
            // - When depthValue = 0 (far):   Z = baseDistance (large Z, away from camera)
            const z = baseDistance - depthValue * depthRange;
            
            // --- SH color coefficients (sRGB to SH degree-0) ---
            const f_dc_0 = (r - 0.5) / SH_C0;
            const f_dc_1 = (g - 0.5) / SH_C0;
            const f_dc_2 = (b - 0.5) / SH_C0;
            
            // --- Opacity (as logit) ---
            // Higher opacity for crisper look, but maintain some transparency at edges
            const opacity = Math.min(0.995, Math.max(0.05, alpha * 0.98));
            const opacityLogit = Math.log(opacity / (1 - opacity));
            
            // --- Scale (as log) ---
            // Uniform splat size for crisp front view - minimal depth scaling
            // This ensures splats match pixel positions when viewed straight on
            const depthScaleFactor = 0.95 + depthValue * 0.1; // Very subtle scaling
            const splatSize = baseSplatSize * depthScaleFactor;
            
            const scale0 = Math.log(splatSize);       // X scale
            const scale1 = Math.log(splatSize);       // Y scale
            const scale2 = Math.log(splatSize * 0.05); // Z scale (very thin for billboard)
            
            // --- Quaternion (identity - facing camera) ---
            const rot0 = 1.0; // w
            const rot1 = 0.0; // x
            const rot2 = 0.0; // y
            const rot3 = 0.0; // z
            
            // Write 14 floats in SHARP order
            view.setFloat32(offset, x, true); offset += 4;
            view.setFloat32(offset, y, true); offset += 4;
            view.setFloat32(offset, z, true); offset += 4;
            view.setFloat32(offset, f_dc_0, true); offset += 4;
            view.setFloat32(offset, f_dc_1, true); offset += 4;
            view.setFloat32(offset, f_dc_2, true); offset += 4;
            view.setFloat32(offset, opacityLogit, true); offset += 4;
            view.setFloat32(offset, scale0, true); offset += 4;
            view.setFloat32(offset, scale1, true); offset += 4;
            view.setFloat32(offset, scale2, true); offset += 4;
            view.setFloat32(offset, rot0, true); offset += 4;
            view.setFloat32(offset, rot1, true); offset += 4;
            view.setFloat32(offset, rot2, true); offset += 4;
            view.setFloat32(offset, rot3, true); offset += 4;
        }
    }
    
    return {
        plyBuffer: buffer,
        metadata: {
            gaussianCount: numPoints,
            depthWidth,
            depthHeight,
            minDepth,
            maxDepth,
        },
    };
}

/**
 * Main message handler
 */
self.onmessage = async (event: MessageEvent<SharpWorkerMessage>) => {
    const { command, imageData, imageUrl, gridSize = 512, depthScale = 1.5, focalLengthPx } = event.data;
    
    if (command === 'preload') {
        try {
            await loadModel();
            self.postMessage({ status: 'preload_complete' });
        } catch (error: any) {
            self.postMessage({ status: 'error', error: error?.message || 'Failed to preload model' });
        }
        return;
    }
    
    if (command !== 'generate') {
        return;
    }
    
    try {
        log(`Starting SHARP depth generation with gridSize=${gridSize} (${gridSize * gridSize} splats)`);
        
        // Step 1: Load image
        self.postMessage({ status: 'processing', progress: 5, message: 'Loading image...' });
        
        let rawImage: any = null;
        let imgWidth: number;
        let imgHeight: number;
        let imgData: Uint8ClampedArray;
        
        if (imageUrl && typeof imageUrl === 'string') {
            rawImage = await RawImage.fromURL(imageUrl);
            imgWidth = rawImage.width;
            imgHeight = rawImage.height;
            
            // Get image data for color sampling
            const tempCanvas = new OffscreenCanvas(imgWidth, imgHeight);
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get canvas context');
            
            // Fetch and draw the image
            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const imageBitmap = await createImageBitmap(blob);
            ctx.drawImage(imageBitmap, 0, 0);
            const canvasData = ctx.getImageData(0, 0, imgWidth, imgHeight);
            imgData = canvasData.data;
            
        } else if (imageData) {
            imgWidth = imageData.width;
            imgHeight = imageData.height;
            imgData = imageData.data instanceof Uint8ClampedArray 
                ? imageData.data 
                : new Uint8ClampedArray(imageData.data);
            
            rawImage = new RawImage(imgData, imgWidth, imgHeight, 4);
        } else {
            throw new Error('No image data provided');
        }
        
        // Step 2: Run neural depth estimation
        self.postMessage({ status: 'processing', progress: 15, message: 'Running neural depth estimation...' });
        const { depth: depthData, width: depthWidth, height: depthHeight } = await estimateNeuralDepth(rawImage);
        
        log(`Depth map: ${depthWidth}x${depthHeight}, range after normalization: 0-1 (1=close, 0=far)`);
        self.postMessage({ status: 'processing', progress: 60, message: 'Neural depth map computed' });
        
        // Step 3: Generate PLY
        self.postMessage({ status: 'processing', progress: 70, message: `Generating ${(gridSize * gridSize / 1000).toFixed(0)}K Gaussian splats...` });
        
        const imageDataObj = new ImageData(imgData, imgWidth, imgHeight);
        const { plyBuffer, metadata } = generateSharpPly(
            imageDataObj,
            depthData,
            depthWidth,
            depthHeight,
            gridSize,
            depthScale,
            focalLengthPx
        );
        
        self.postMessage({ status: 'processing', progress: 95, message: 'Finalizing...' });
        
        // Step 4: Return result
        self.postMessage(
            {
                status: 'complete',
                progress: 100,
                plyBuffer,
                metadata,
                depthWidth,
                depthHeight,
            },
            [plyBuffer]
        );
        
        log('Generation complete', metadata);
        
    } catch (error: any) {
        console.error('[SharpDepthWorker] Error:', error);
        self.postMessage({
            status: 'error',
            error: error?.message || 'Unknown error occurred',
        });
    }
};



