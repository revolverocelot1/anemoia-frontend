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
// CRITICAL: Use single-threaded mode for stability across environments
// Multi-threading can cause stalls even when SharedArrayBuffer is available
try {
    env.backends.onnx.wasm = {
        wasmPaths: wasmBasePath,
        // Use single-threaded mode for maximum compatibility and stability
        numThreads: 1,
        // SIMD should work without SharedArrayBuffer
        simd: true,
        // Disable proxy to simplify execution
        proxy: false,
    };

    console.debug('[SharpDepthWorker] WASM config:', {
        wasmPaths: wasmBasePath,
        numThreads: 1,
        hasSharedArrayBuffer,
        isCrossOriginIsolated,
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
    const isLargeModel = numPoints > 1_500_000; // 1.5M+ splats need progress reporting
    
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
    const bytesPerPoint = floatsPerPoint * 4; // 56 bytes per splat
    const dataBytes = numPoints * bytesPerPoint;
    
    // Memory check for large models
    const totalBufferMB = (headerBytes.length + dataBytes) / (1024 * 1024);
    log(`Allocating PLY buffer: ${totalBufferMB.toFixed(1)} MB for ${numPoints.toLocaleString()} splats`);
    
    let buffer: ArrayBuffer;
    try {
        buffer = new ArrayBuffer(headerBytes.length + dataBytes);
    } catch (e) {
        throw new Error(`Failed to allocate ${totalBufferMB.toFixed(0)}MB buffer for ${numPoints.toLocaleString()} splats. Your device may not have enough memory.`);
    }
    
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
    // For extreme grid sizes (2M/3M), use slightly tighter overlap factor for crisper detail
    const overlapFactor = gridSize >= 1414 ? 1.02 : 1.05;
    const baseSplatSize = (sceneWidth / gridSize) * overlapFactor;
    
    let minDepth = Infinity, maxDepth = -Infinity;
    
    // Pre-cache reciprocals for performance (avoids repeated division in hot loop)
    const gridSizeM1 = gridSize - 1;
    const invGridSizeM1 = 1.0 / gridSizeM1;
    const imgWidthM1 = imgWidth - 1;
    const imgHeightM1 = imgHeight - 1;
    const depthWidthM1 = depthWidth - 1;
    const depthHeightM1 = depthHeight - 1;
    
    // Progress reporting interval for large models (every ~5% of rows)
    const progressInterval = isLargeModel ? Math.max(1, Math.floor(gridSize / 20)) : 0;
    let lastProgressRow = 0;
    
    for (let gy = 0; gy < gridSize; gy++) {
        // Report progress for large models (2M/3M)
        if (isLargeModel && progressInterval > 0 && gy - lastProgressRow >= progressInterval) {
            lastProgressRow = gy;
            const plyProgress = 70 + (gy / gridSize) * 25; // 70% to 95%
            self.postMessage({ 
                status: 'processing', 
                progress: Math.round(plyProgress), 
                message: `Building ${(numPoints / 1_000_000).toFixed(1)}M splats... ${Math.round((gy / gridSize) * 100)}%` 
            });
        }
        
        for (let gx = 0; gx < gridSize; gx++) {
            // Sample from image using bilinear interpolation
            const imgXFloat = (gx * invGridSizeM1) * imgWidthM1;
            const imgYFloat = (gy * invGridSizeM1) * imgHeightM1;
            const imgX = Math.floor(imgXFloat);
            const imgY = Math.floor(imgYFloat);
            const fracX = imgXFloat - imgX;
            const fracY = imgYFloat - imgY;
            
            // Bilinear sampling for color (inlined for performance in large models)
            const cx00 = Math.min(imgX, imgWidthM1);
            const cy00 = Math.min(imgY, imgHeightM1);
            const cx10 = Math.min(imgX + 1, imgWidthM1);
            const cy10 = cy00;
            const cx01 = cx00;
            const cy01 = Math.min(imgY + 1, imgHeightM1);
            const cx11 = cx10;
            const cy11 = cy01;
            
            const idx00 = (cy00 * imgWidth + cx00) * 4;
            const idx10 = (cy10 * imgWidth + cx10) * 4;
            const idx01 = (cy01 * imgWidth + cx01) * 4;
            const idx11 = (cy11 * imgWidth + cx11) * 4;
            
            const inv255 = 1.0 / 255.0;
            const w00 = (1 - fracX) * (1 - fracY);
            const w10 = fracX * (1 - fracY);
            const w01 = (1 - fracX) * fracY;
            const w11 = fracX * fracY;
            
            const r = w00 * imgData[idx00] * inv255 + w10 * imgData[idx10] * inv255 + 
                      w01 * imgData[idx01] * inv255 + w11 * imgData[idx11] * inv255;
            const g = w00 * imgData[idx00 + 1] * inv255 + w10 * imgData[idx10 + 1] * inv255 + 
                      w01 * imgData[idx01 + 1] * inv255 + w11 * imgData[idx11 + 1] * inv255;
            const b = w00 * imgData[idx00 + 2] * inv255 + w10 * imgData[idx10 + 2] * inv255 + 
                      w01 * imgData[idx01 + 2] * inv255 + w11 * imgData[idx11 + 2] * inv255;
            const alpha = w00 * imgData[idx00 + 3] * inv255 + w10 * imgData[idx10 + 3] * inv255 + 
                          w01 * imgData[idx01 + 3] * inv255 + w11 * imgData[idx11 + 3] * inv255;
            
            // Sample depth with bilinear interpolation (mapping to depth map coords)
            const depthXFloat = (gx * invGridSizeM1) * depthWidthM1;
            const depthYFloat = (gy * invGridSizeM1) * depthHeightM1;
            const depthX = Math.floor(depthXFloat);
            const depthY = Math.floor(depthYFloat);
            const depthFracX = depthXFloat - depthX;
            const depthFracY = depthYFloat - depthY;
            
            const dcx0 = Math.min(Math.max(depthX, 0), depthWidthM1);
            const dcy0 = Math.min(Math.max(depthY, 0), depthHeightM1);
            const dcx1 = Math.min(depthX + 1, depthWidthM1);
            const dcy1 = Math.min(depthY + 1, depthHeightM1);
            
            const d00 = depthData[dcy0 * depthWidth + dcx0];
            const d10 = depthData[dcy0 * depthWidth + dcx1];
            const d01 = depthData[dcy1 * depthWidth + dcx0];
            const d11 = depthData[dcy1 * depthWidth + dcx1];
            
            const dw00 = (1 - depthFracX) * (1 - depthFracY);
            const dw10 = depthFracX * (1 - depthFracY);
            const dw01 = (1 - depthFracX) * depthFracY;
            const dw11 = depthFracX * depthFracY;
            
            const depthValue = dw00 * d00 + dw10 * d10 + dw01 * d01 + dw11 * d11;
            
            // Track depth stats
            if (depthValue < minDepth) minDepth = depthValue;
            if (depthValue > maxDepth) maxDepth = depthValue;
            
            // --- Position calculation ---
            // X, Y: Normalized screen coordinates (-0.5 to 0.5) scaled to scene size
            const normalizedX = (gx * invGridSizeM1) - 0.5;
            const normalizedY = (gy * invGridSizeM1) - 0.5;
            
            const x = normalizedX * sceneWidth;  // Left-right
            const y = normalizedY * sceneHeight; // Keep image Y orientation (gsplat projection flips Y internally)
            
            // Z: Depth positioning, centered at origin
            // depthValue: 1 = closest to camera, 0 = farthest
            // Camera views from negative Z, so close objects get negative Z
            // - When depthValue = 1 (close): Z = -depthRange/2 (negative Z, near camera)
            // - When depthValue = 0 (far):   Z = +depthRange/2 (positive Z, away from camera)
            const z = (0.5 - depthValue) * depthRange;
            
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
            // rot0=1, rot1/2/3=0 (identity quaternion)
            
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
            view.setFloat32(offset, 1.0, true); offset += 4; // rot_0 (w)
            view.setFloat32(offset, 0.0, true); offset += 4; // rot_1 (x)
            view.setFloat32(offset, 0.0, true); offset += 4; // rot_2 (y)
            view.setFloat32(offset, 0.0, true); offset += 4; // rot_3 (z)
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



