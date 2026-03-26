// @ts-nocheck
/* eslint-disable */
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
    } catch {
        // ignore
    }
};

let depthEstimator: any = null;
let modelLoadPromise: Promise<any> | null = null;
let currentModelId = '';

// SH degree-0 coefficient
const SH_C0 = 0.28209479177387814;

interface SharpWorkerMessage {
    command: 'generate' | 'preload';
    imageData?: ImageData;
    imageUrl?: string;
    gridSize?: number;
    depthScale?: number;
    focalLengthPx?: number;
    useBaseModel?: boolean;
}

interface GeneratedPlyResult {
    plyBuffer: ArrayBuffer;
    metadata: {
        gaussianCount: number;
        depthWidth: number;
        depthHeight: number;
        minDepth: number;
        maxDepth: number;
        boundsMin: [number, number, number];
        boundsMax: [number, number, number];
        center: [number, number, number];
        focusDepth: number;
        cameraSpace: boolean;
        frontBeta: number;
        parallaxBeta: number;
        focalLength: number;
        width: number;
        height: number;
    };
}

// ── Color space conversion (matching SHARP's color_space.py) ──


/**
 * Load the depth estimation model (cached after first load)
 */
async function loadModel(useBaseModel: boolean = false): Promise<any> {
    const modelId = useBaseModel
        ? 'onnx-community/depth-anything-v2-base'
        : 'onnx-community/depth-anything-v2-small';

    if (depthEstimator && currentModelId === modelId) return depthEstimator;
    if (currentModelId !== modelId) {
        depthEstimator = null;
        modelLoadPromise = null;
    }
    if (modelLoadPromise) return modelLoadPromise;

    currentModelId = modelId;

    modelLoadPromise = (async () => {
        const label = useBaseModel ? 'Depth Anything V2 Base (190MB)' : 'Depth Anything V2 Small (50MB)';
        self.postMessage({ status: 'loading_model', progress: 0, message: `Loading ${label}...` });

        depthEstimator = await pipeline(
            'depth-estimation',
            modelId,
            {
                progress_callback: (progress: any) => {
                    if (progress.status === 'downloading' || progress.status === 'progress') {
                        const pct = progress.progress ? Math.round(progress.progress) : 0;
                        self.postMessage({ status: 'loading_model', progress: pct / 10, message: `Loading model: ${pct}%` });
                    }
                }
            }
        );

        self.postMessage({ status: 'model_ready', progress: 10, message: `${label} loaded` });
        return depthEstimator;
    })();

    return modelLoadPromise;
}

/**
 * Estimate depth from image using neural network.
 *
 * Returns the **raw disparity** values (not normalized) plus their min/max
 * so the PLY generator can reconstruct metric depth via:
 *   metric_depth = disparity_factor / raw_disparity
 *
 * Depth Anything V2 outputs DISPARITY (inverse depth):
 *   - Higher raw values = CLOSER to camera
 *   - Lower raw values = FARTHER from camera
 */
async function estimateNeuralDepth(
    rawImage: any,
    useBaseModel: boolean = false,
): Promise<{
    depth: Float32Array;      // raw disparity values (NOT normalized)
    width: number;
    height: number;
    rawMin: number;           // min raw disparity (farthest)
    rawMax: number;           // max raw disparity (closest)
}> {
    const estimator = await loadModel(useBaseModel);

    self.postMessage({ status: 'processing', progress: 20, message: 'Running neural depth estimation...' });

    // Convert to RGB (drop alpha)
    rawImage.convert(3);

    const result = await estimator(rawImage);

    if (!result || !result.depth) {
        throw new Error('Invalid result from depth estimation');
    }

    const { data: depthData, width: depthWidth, height: depthHeight } = result.depth;

    // Keep the raw disparity — we need the actual values for metric depth conversion
    const rawDepth = new Float32Array(depthData as Float32Array);
    let rawMin = Number.POSITIVE_INFINITY;
    let rawMax = Number.NEGATIVE_INFINITY;

    for (let i = 0; i < rawDepth.length; i++) {
        const v = rawDepth[i];
        if (v < rawMin) rawMin = v;
        if (v > rawMax) rawMax = v;
    }

    return {
        depth: rawDepth,
        width: depthWidth,
        height: depthHeight,
        rawMin,
        rawMax,
    };
}

/**
 * Generate SHARP-compatible PLY from image + raw disparity using proper
 * pinhole-camera unprojection — the same math as in SHARP's composer.py
 * and gaussians.py.
 *
 * Key equations (from ml-sharp source):
 *   Depth Anything V2 disparity is RELATIVE (arbitrary scale), so we:
 *     1. Normalize disparity to [0, 1]  (0 = far, 1 = close)
 *     2. Map to metric depth range [depthNear, depthFar] via inverse disparity
 *        (matching SHARP's _rescale_depth which sets min_depth=1.0)
 *     3. Unproject using pinhole camera model:
 *          x = depth * x_ndc * (W / 2fx)
 *          y = depth * y_ndc * (H / 2fy)
 *          z = depth
 *
 * PLY format: 14 floats per vertex (x y z f_dc_0..2 opacity scale_0..2 rot_0..3)
 * Coordinate system: OpenCV convention (x-right, y-down, z-forward)
 */
function generateSharpPly(
    imageData: ImageData,
    depthData: Float32Array,   // raw disparity from Depth Anything (NOT normalized)
    depthWidth: number,
    depthHeight: number,
    gridSize: number,
    depthScale: number = 1.5,
    focalLengthPx?: number,
    rawDisparityMin: number = 0.001,
    rawDisparityMax: number = 1.0,
): GeneratedPlyResult {
    const { width: imgWidth, height: imgHeight, data: imgData } = imageData;

    // ── Focal length (matching SHARP's io.py convert_focallength) ──
    const fx = focalLengthPx ?? (30 * Math.sqrt(imgWidth * imgWidth + imgHeight * imgHeight) / Math.sqrt(36 * 36 + 24 * 24));
    const fy = fx; // square pixels

    // ── Depth range (matching SHARP's _rescale_depth: min_depth=1.0, max=100) ──
    // SHARP normalizes so the closest object has depth = 1.0 meter.
    // A tighter depth range keeps the model compact and sharp when viewed.
    // depthScale controls how much Z-separation there is between near and far.
    const DEPTH_NEAR = 2.0;                              // closest object depth
    const DEPTH_FAR = DEPTH_NEAR + depthScale * 3.0;     // far plane (~6.5 for default depthScale=1.5)

    const numPoints = gridSize * gridSize;
    const isLargeModel = numPoints > 1_500_000;

    // ── PLY header with camera metadata as comments ──
    // Using PLY comments (not elements) because gsplat's PLYLoader
    // can't handle multi-element PLY files and crashes on extra elements.
    // Comments are universally ignored by all PLY parsers.
    // Our viewer parses these structured comments for camera setup.
    const cx = (imgWidth - 1) * 0.5;
    const cy = (imgHeight - 1) * 0.5;

    const header =
`ply
format binary_little_endian 1.0
comment sharp_intrinsic ${fx} ${fy} ${cx} ${cy}
comment sharp_image_size ${imgWidth} ${imgHeight}
comment sharp_extrinsic identity
comment sharp_color_space srgb
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
    const bytesPerPoint = floatsPerPoint * 4;
    const dataBytes = numPoints * bytesPerPoint;

    const totalBufferMB = (headerBytes.length + dataBytes) / (1024 * 1024);
    log(`Allocating PLY buffer: ${totalBufferMB.toFixed(1)} MB for ${numPoints.toLocaleString()} splats`);

    let buffer: ArrayBuffer;
    try {
        buffer = new ArrayBuffer(headerBytes.length + dataBytes);
    } catch {
        throw new Error(`Failed to allocate ${totalBufferMB.toFixed(0)}MB for ${numPoints.toLocaleString()} splats. Not enough memory.`);
    }

    const view = new DataView(buffer);
    headerBytes.forEach((byte, i) => view.setUint8(i, byte));
    let offset = headerBytes.length;

    // ── Pre-compute unprojection factors ──
    // NDC unprojection: X = Z * x_ndc * (W / (2*fx)), Y = Z * y_ndc * (H / (2*fy))
    const halfW_over_fx = imgWidth / (2.0 * fx);
    const halfH_over_fy = imgHeight / (2.0 * fy);

    // ── Disparity normalization ──
    // Depth Anything V2 outputs RELATIVE disparity in arbitrary scale (e.g. 50-200).
    // We normalize to [0,1] then map to metric depth via inverse relationship.
    const rawRange = rawDisparityMax - rawDisparityMin || 1.0;

    // ── Splat scale (UNIFORM for sharpness) ──
    // Use UNIFORM splat sizes based on the scene footprint at DEPTH_NEAR.
    // This keeps the front view pixel-sharp. Far objects may have tiny gaps
    // between splats, but this is barely visible.
    //   At DEPTH_NEAR, the full image width spans: 2 * DEPTH_NEAR * halfW_over_fx
    //   So each grid cell at that depth is: (2 * DEPTH_NEAR * halfW_over_fx) / gridSize
    const sceneWidthAtNear = 2.0 * DEPTH_NEAR * halfW_over_fx;
    const baseSplatSizeX = (sceneWidthAtNear / gridSize) * 1.05; // 5% overlap for seamless tiling
    const baseSplatSizeY = baseSplatSizeX; // square splats (aspect handled by position)

    const gridSizeM1 = gridSize - 1;
    const invGridSizeM1 = 1.0 / gridSizeM1;
    const imgWidthM1 = imgWidth - 1;
    const imgHeightM1 = imgHeight - 1;
    const depthWidthM1 = depthWidth - 1;
    const depthHeightM1 = depthHeight - 1;

    let minDepthVal = Infinity, maxDepthVal = -Infinity;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;

    const progressInterval = isLargeModel ? Math.max(1, Math.floor(gridSize / 20)) : 0;
    let lastProgressRow = 0;

    log(`Camera unprojection: fx=${fx.toFixed(1)}, fy=${fy.toFixed(1)}, depthRange=[${DEPTH_NEAR}, ${DEPTH_FAR.toFixed(1)}], rawDisp=[${rawDisparityMin.toFixed(2)}, ${rawDisparityMax.toFixed(2)}], splatSize=${baseSplatSizeX.toFixed(6)}`);

    for (let gy = 0; gy < gridSize; gy++) {
        if (isLargeModel && progressInterval > 0 && gy - lastProgressRow >= progressInterval) {
            lastProgressRow = gy;
            const plyProgress = 70 + (gy / gridSize) * 25;
            self.postMessage({
                status: 'processing',
                progress: Math.round(plyProgress),
                message: `Building ${(numPoints / 1_000_000).toFixed(1)}M splats... ${Math.round((gy / gridSize) * 100)}%`,
            });
        }

        for (let gx = 0; gx < gridSize; gx++) {
            // ── Bilinear color sampling from source image ──
            const imgXFloat = (gx * invGridSizeM1) * imgWidthM1;
            const imgYFloat = (gy * invGridSizeM1) * imgHeightM1;
            const imgX = Math.floor(imgXFloat);
            const imgY = Math.floor(imgYFloat);
            const fracX = imgXFloat - imgX;
            const fracY = imgYFloat - imgY;

            const cx00 = Math.min(imgX, imgWidthM1);
            const cy00 = Math.min(imgY, imgHeightM1);
            const cx10 = Math.min(imgX + 1, imgWidthM1);
            const cy01 = Math.min(imgY + 1, imgHeightM1);

            const idx00 = (cy00 * imgWidth + cx00) * 4;
            const idx10 = (cy00 * imgWidth + cx10) * 4;
            const idx01 = (cy01 * imgWidth + cx00) * 4;
            const idx11 = (cy01 * imgWidth + cx10) * 4;

            const inv255 = 1.0 / 255.0;
            const w00 = (1 - fracX) * (1 - fracY);
            const w10 = fracX * (1 - fracY);
            const w01 = (1 - fracX) * fracY;
            const w11 = fracX * fracY;

            // Sampled sRGB [0,1]
            const r_srgb = w00 * imgData[idx00]     * inv255 + w10 * imgData[idx10]     * inv255 +
                           w01 * imgData[idx01]     * inv255 + w11 * imgData[idx11]     * inv255;
            const g_srgb = w00 * imgData[idx00 + 1] * inv255 + w10 * imgData[idx10 + 1] * inv255 +
                           w01 * imgData[idx01 + 1] * inv255 + w11 * imgData[idx11 + 1] * inv255;
            const b_srgb = w00 * imgData[idx00 + 2] * inv255 + w10 * imgData[idx10 + 2] * inv255 +
                           w01 * imgData[idx01 + 2] * inv255 + w11 * imgData[idx11 + 2] * inv255;
            const alpha  = w00 * imgData[idx00 + 3] * inv255 + w10 * imgData[idx10 + 3] * inv255 +
                           w01 * imgData[idx01 + 3] * inv255 + w11 * imgData[idx11 + 3] * inv255;

            // ── Bilinear depth (disparity) sampling ──
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

            // Raw disparity value (higher = closer)
            const rawDisparity = dw00 * d00 + dw10 * d10 + dw01 * d01 + dw11 * d11;

            // ── Disparity → metric depth ──
            // Step 1: Normalize raw disparity to [0, 1] where 1 = closest, 0 = farthest
            const normalizedDisp = Math.max(0.001, Math.min(1.0, (rawDisparity - rawDisparityMin) / rawRange));

            // Step 2: Map to metric depth via inverse disparity relationship
            //   disparity ∝ 1/depth, so:
            //   depth = 1 / (normalizedDisp * (1/DEPTH_NEAR - 1/DEPTH_FAR) + 1/DEPTH_FAR)
            // This ensures: normalizedDisp=1 → depth=DEPTH_NEAR, normalizedDisp=0 → depth=DEPTH_FAR
            const invNear = 1.0 / DEPTH_NEAR;
            const invFar = 1.0 / DEPTH_FAR;
            const metricDepth = 1.0 / (normalizedDisp * (invNear - invFar) + invFar);

            // Track depth stats
            if (metricDepth < minDepthVal) minDepthVal = metricDepth;
            if (metricDepth > maxDepthVal) maxDepthVal = metricDepth;

            // ── Pinhole camera unprojection (SHARP _mean_activation + unproject_gaussians) ──
            // NDC coordinates in [-1, 1] range (center of each grid cell)
            const x_ndc = 2.0 * ((gx + 0.5) / gridSize) - 1.0;
            const y_ndc = 2.0 * ((gy + 0.5) / gridSize) - 1.0;

            // Unproject: from NDC → camera-space 3D coordinates
            //   X = Z * x_ndc * (W / (2*fx))
            //   Y = Z * y_ndc * (H / (2*fy))
            //   Z = metric_depth
            const x = metricDepth * x_ndc * halfW_over_fx;
            const y = metricDepth * y_ndc * halfH_over_fy;
            const z = metricDepth;

            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (z < minZ) minZ = z;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            if (z > maxZ) maxZ = z;

            // ── Color: sRGB → linearRGB → SH, then linearRGB → sRGB for export ──
            // SHARP predicts in linearRGB space internally, but exports sRGB SH
            // for compatibility with public renderers (gaussians.py save_ply lines 359-373)
            // Since our input is already sRGB, we keep it as-is for the SH conversion.
            const f_dc_0 = (r_srgb - 0.5) / SH_C0;
            const f_dc_1 = (g_srgb - 0.5) / SH_C0;
            const f_dc_2 = (b_srgb - 0.5) / SH_C0;

            // ── Opacity logit ──
            const opacity = Math.min(0.995, Math.max(0.05, alpha * 0.98));
            const opacityLogit = Math.log(opacity / (1 - opacity));

            // ── UNIFORM splat scale (sharp front view) ──
            // All splats get the same size based on the near-plane footprint.
            // This keeps the model crisp when viewed from the front.
            // Slight depth-based thinning in Z prevents layering artifacts.
            const scale0 = Math.log(baseSplatSizeX);                 // X scale
            const scale1 = Math.log(baseSplatSizeY);                 // Y scale  
            const scale2 = Math.log(baseSplatSizeX * 0.05);          // Z scale (very thin for billboard)

            // ── Write 14 floats ──
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

    // Focus depth: 10th percentile of metric depth (matching SHARP camera.py)
    const focusDepth = minZ + (maxZ - minZ) * 0.1;

    log(`PLY complete: ${numPoints.toLocaleString()} splats, metadata in comments [fx=${fx.toFixed(1)}, image=${imgWidth}×${imgHeight}]`);

    return {
        plyBuffer: buffer,
        metadata: {
            gaussianCount: numPoints,
            depthWidth,
            depthHeight,
            minDepth: minDepthVal,
            maxDepth: maxDepthVal,
            boundsMin: [minX, minY, minZ],
            boundsMax: [maxX, maxY, maxZ],
            center: [
                (minX + maxX) * 0.5,
                (minY + maxY) * 0.5,
                (minZ + maxZ) * 0.5,
            ],
            focusDepth,
            cameraSpace: true,
            frontBeta: 0.025,
            parallaxBeta: 0.065,
            focalLength: fx,      // for viewer FOV calculation
            width: imgWidth,      // for viewer aspect ratio
            height: imgHeight,
        },
    };
}

/**
 * Main message handler
 */
self.onmessage = async (event: MessageEvent<SharpWorkerMessage>) => {
    const { command, imageData, imageUrl, gridSize = 512, depthScale = 1.5, focalLengthPx, useBaseModel = false } = event.data;
    
    if (command === 'preload') {
        try {
            await loadModel(useBaseModel);
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
        const { depth: depthData, width: depthWidth, height: depthHeight, rawMin, rawMax } = await estimateNeuralDepth(rawImage, useBaseModel);
        
        log(`Depth map: ${depthWidth}x${depthHeight}, raw disparity range: [${rawMin.toFixed(4)}, ${rawMax.toFixed(4)}]`);
        self.postMessage({ status: 'processing', progress: 60, message: 'Neural depth map computed' });
        
        // Step 3: Generate PLY with proper camera unprojection
        self.postMessage({ status: 'processing', progress: 70, message: `Generating ${(gridSize * gridSize / 1000).toFixed(0)}K Gaussian splats...` });
        
        const imageDataObj = new ImageData(imgData, imgWidth, imgHeight);
        const { plyBuffer, metadata } = generateSharpPly(
            imageDataObj,
            depthData,
            depthWidth,
            depthHeight,
            gridSize,
            depthScale,
            focalLengthPx,
            rawMin,
            rawMax,
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



