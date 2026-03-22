/**
 * SHARP Enhanced Worker — Quality-Focused Gaussian Splat Generation
 * 
 * Same splat count as standard pipeline, dramatically better quality through:
 * 
 * 1. Perspective-correct unprojection (pinhole camera model)
 * 2. Proper disparity → depth conversion (1/disparity, not linear)
 * 3. Gamma-correct color blending, re-encoded for display-correct SH output
 * 4. Edge-aware bilateral depth upsampling (sharp depth at color edges)
 * 5. Depth-adaptive splat scaling (proper 3D coverage at all depths)
 * 6. Optional V2-Base model for higher-quality depth estimation
 * 
 * Uses the SAME uniform grid as standard pipeline (gridSize × gridSize).
 * Outputs standard PLY (14×float32, gsplat.js compatible).
 * Does NOT modify sharp-depth.worker.ts or any other workers.
 */
import { env, pipeline, RawImage } from '@xenova/transformers';

// ─── WASM Configuration ──────────────────────────────────────────────────────
const wasmBasePath = `${self.location.origin}/ort-wasm/`;
env.allowLocalModels = false;
env.allowRemoteModels = true;

try {
    env.backends.onnx.wasm = {
        wasmPaths: wasmBasePath,
        numThreads: 1,
        simd: true,
        proxy: false,
    };
} catch (e) {
    console.warn('[SharpEnhanced] ONNX config failed:', e);
}

// ─── Constants ───────────────────────────────────────────────────────────────
const SH_C0 = 0.28209479177387814;

// ─── Types ───────────────────────────────────────────────────────────────────
interface EnhancedWorkerMessage {
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
    };
}

const log = (...args: any[]) => {
    try { console.debug('[SharpEnhanced]', ...args); } catch (_) {}
};

// ─── Model Management ────────────────────────────────────────────────────────
let depthEstimator: any = null;
let modelLoadPromise: Promise<any> | null = null;
let currentModelId = '';

async function loadModel(useBase: boolean = false): Promise<any> {
    const modelId = useBase
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
        const label = useBase ? 'V2-Base (HD, 190MB)' : 'V2-Small (50MB)';
        self.postMessage({ status: 'loading_model', progress: 0, message: `Loading Depth Anything ${label}...` });

        depthEstimator = await pipeline('depth-estimation', modelId, {
            progress_callback: (progress: any) => {
                if (progress.status === 'downloading' || progress.status === 'progress') {
                    const pct = progress.progress ? Math.round(progress.progress) : 0;
                    self.postMessage({ status: 'loading_model', progress: pct / 10, message: `Downloading ${label}: ${pct}%` });
                }
            }
        });

        self.postMessage({ status: 'model_ready', progress: 10, message: `${label} loaded` });
        return depthEstimator;
    })();

    return modelLoadPromise;
}

// ─── Depth Estimation ────────────────────────────────────────────────────────
async function estimateDepth(rawImage: any, useBase: boolean): Promise<{ depth: Float32Array; width: number; height: number }> {
    const estimator = await loadModel(useBase);
    self.postMessage({ status: 'processing', progress: 15, message: 'Running neural depth estimation...' });

    rawImage.convert(3);
    const result = await estimator(rawImage);
    if (!result?.depth) throw new Error('Invalid depth estimation result');

    const { data: rawDepth, width: dw, height: dh } = result.depth;
    const arr = Array.from(rawDepth as Float32Array);

    let min = Infinity, max = -Infinity;
    for (const v of arr) {
        if (v < min) min = v;
        if (v > max) max = v;
    }

    const range = max - min || 1;
    const normalized = new Float32Array(arr.length);
    for (let i = 0; i < arr.length; i++) {
        normalized[i] = (arr[i] - min) / range; // 1=close, 0=far
    }

    return { depth: normalized, width: dw, height: dh };
}

// ─── sRGB Gamma Decoding ─────────────────────────────────────────────────────
function srgbToLinear(c: number): number {
    return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}

function linearToSrgb(c: number): number {
    const clamped = Math.max(0, Math.min(1, c));
    return clamped <= 0.0031308
        ? 12.92 * clamped
        : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

// ─── Edge-Aware Bilateral Depth Upsampling ───────────────────────────────────
/**
 * Upsamples the low-res depth map to full image resolution.
 * Uses color edges from the original image to preserve sharp depth boundaries.
 * This is THE critical quality improvement — depth edges align with color edges.
 */
function bilateralUpsampleDepth(
    depthLR: Float32Array, dw: number, dh: number,
    imageHR: Uint8ClampedArray, iw: number, ih: number
): Float32Array {
    const output = new Float32Array(iw * ih);
    const sigmaS = 2.5;    // spatial
    const sigmaC = 25.0;   // color
    const inv2S2 = -1.0 / (2 * sigmaS * sigmaS);
    const inv2C2 = -1.0 / (2 * sigmaC * sigmaC);
    const radius = 2;

    for (let iy = 0; iy < ih; iy++) {
        for (let ix = 0; ix < iw; ix++) {
            const dxf = (ix / (iw - 1)) * (dw - 1);
            const dyf = (iy / (ih - 1)) * (dh - 1);
            const dx0 = Math.floor(dxf);
            const dy0 = Math.floor(dyf);

            const iIdx = (iy * iw + ix) * 4;
            const refR = imageHR[iIdx], refG = imageHR[iIdx + 1], refB = imageHR[iIdx + 2];

            let wSum = 0, dSum = 0;

            for (let ny = -radius; ny <= radius; ny++) {
                for (let nx = -radius; nx <= radius; nx++) {
                    const sx = Math.min(Math.max(dx0 + nx, 0), dw - 1);
                    const sy = Math.min(Math.max(dy0 + ny, 0), dh - 1);

                    const ws = Math.exp((nx * nx + ny * ny) * inv2S2);

                    const cix = Math.min(Math.round((sx / (dw - 1)) * (iw - 1)), iw - 1);
                    const ciy = Math.min(Math.round((sy / (dh - 1)) * (ih - 1)), ih - 1);
                    const cIdx = (ciy * iw + cix) * 4;

                    const dr = refR - imageHR[cIdx];
                    const dg = refG - imageHR[cIdx + 1];
                    const db = refB - imageHR[cIdx + 2];
                    const wc = Math.exp((dr * dr + dg * dg + db * db) * inv2C2);

                    const w = ws * wc;
                    wSum += w;
                    dSum += w * depthLR[sy * dw + sx];
                }
            }

            output[iy * iw + ix] = wSum > 0 ? dSum / wSum :
                depthLR[Math.min(dy0, dh - 1) * dw + Math.min(dx0, dw - 1)];
        }
    }

    return output;
}

// ─── Enhanced PLY Generation ─────────────────────────────────────────────────
/**
 * SAME uniform grid as standard pipeline, but with correct math:
 * 
 * 1. Perspective unprojection: x = (u - cx)/fx * z, y = (v - cy)/fy * z
 * 2. Disparity→depth: z = scale / (disparity + eps) instead of linear
 * 3. Gamma-correct colors: sRGB → linear → SH
 * 4. Depth-adaptive splat scaling: size ∝ z/fx (perspective-correct)
 */
function generateEnhancedPly(
    imageData: ImageData,
    depthHR: Float32Array,  // Upsampled to image resolution
    depthW: number,
    depthH: number,
    gridSize: number,
    depthScale: number,
    focalLengthPx: number
): GeneratedPlyResult {
    const { width: imgW, height: imgH, data: imgData } = imageData;

    const numPoints = gridSize * gridSize;
    const isLargeModel = numPoints > 1_500_000;

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
    const bytesPerPoint = floatsPerPoint * 4;
    const dataBytes = numPoints * bytesPerPoint;

    const totalMB = (headerBytes.length + dataBytes) / (1024 * 1024);
    log(`Allocating enhanced PLY: ${totalMB.toFixed(1)} MB for ${numPoints.toLocaleString()} splats`);

    const buffer = new ArrayBuffer(headerBytes.length + dataBytes);
    const view = new DataView(buffer);
    headerBytes.forEach((byte, i) => view.setUint8(i, byte));
    let offset = headerBytes.length;

    // ─── Camera intrinsics (pinhole model) ───────────────────────────
    const fx = focalLengthPx;
    const fy = focalLengthPx;
    const cx = imgW / 2;
    const cy = imgH / 2;

    // ─── Depth scale: controls how spread out the scene is in Z ──────
    // Higher = more depth separation. 
    // We use depthScale directly as the numerator in depth = scale/disparity
    const sceneDepthScale = depthScale;

    // ─── Base splat size in pixels (for perspective-correct sizing) ───
    // Each splat covers approximately (imgW/gridSize) × (imgH/gridSize) pixels
    // In 3D, a pixel at depth z subtends: pixelSize3D = z / fx
    // So splat size = pixelCoverage * z / fx
    const pixelCoverageX = imgW / gridSize;
    const pixelCoverageY = imgH / gridSize;
    const overlapFactor = gridSize >= 1414 ? 1.03 : 1.06; // Slight overlap for coverage

    let minDepth = Infinity, maxDepth = -Infinity;
    let minX = Infinity, minY = Infinity, minZ = Infinity;
    let maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    let weightedDepthSum = 0;
    let weightedDepthWeight = 0;

    const gridM1 = gridSize - 1;
    const invGridM1 = 1.0 / gridM1;
    const imgWM1 = imgW - 1;
    const imgHM1 = imgH - 1;
    const depthWM1 = depthW - 1;
    const depthHM1 = depthH - 1;

    const progressInterval = isLargeModel ? Math.max(1, Math.floor(gridSize / 20)) : 0;
    let lastProgressRow = 0;

    for (let gy = 0; gy < gridSize; gy++) {
        if (isLargeModel && progressInterval > 0 && gy - lastProgressRow >= progressInterval) {
            lastProgressRow = gy;
            const plyProgress = 70 + (gy / gridSize) * 25;
            self.postMessage({
                status: 'processing',
                progress: Math.round(plyProgress),
                message: `Building ${(numPoints / 1_000_000).toFixed(1)}M enhanced splats... ${Math.round((gy / gridSize) * 100)}%`
            });
        }

        for (let gx = 0; gx < gridSize; gx++) {
            // ─── Image pixel coordinates ─────────────────────────────
            const imgXF = (gx * invGridM1) * imgWM1;
            const imgYF = (gy * invGridM1) * imgHM1;
            const imgX = Math.floor(imgXF);
            const imgY = Math.floor(imgYF);
            const fracX = imgXF - imgX;
            const fracY = imgYF - imgY;

            // ─── Bilinear color sampling ─────────────────────────────
            const x0 = Math.min(imgX, imgWM1);
            const y0 = Math.min(imgY, imgHM1);
            const x1 = Math.min(imgX + 1, imgWM1);
            const y1 = Math.min(imgY + 1, imgHM1);

            const i00 = (y0 * imgW + x0) * 4;
            const i10 = (y0 * imgW + x1) * 4;
            const i01 = (y1 * imgW + x0) * 4;
            const i11 = (y1 * imgW + x1) * 4;

            const inv255 = 1.0 / 255.0;
            const w00 = (1 - fracX) * (1 - fracY);
            const w10 = fracX * (1 - fracY);
            const w01 = (1 - fracX) * fracY;
            const w11 = fracX * fracY;

            const blendedLinearR =
                w00 * srgbToLinear(imgData[i00] * inv255) +
                w10 * srgbToLinear(imgData[i10] * inv255) +
                w01 * srgbToLinear(imgData[i01] * inv255) +
                w11 * srgbToLinear(imgData[i11] * inv255);
            const blendedLinearG =
                w00 * srgbToLinear(imgData[i00+1] * inv255) +
                w10 * srgbToLinear(imgData[i10+1] * inv255) +
                w01 * srgbToLinear(imgData[i01+1] * inv255) +
                w11 * srgbToLinear(imgData[i11+1] * inv255);
            const blendedLinearB =
                w00 * srgbToLinear(imgData[i00+2] * inv255) +
                w10 * srgbToLinear(imgData[i10+2] * inv255) +
                w01 * srgbToLinear(imgData[i01+2] * inv255) +
                w11 * srgbToLinear(imgData[i11+2] * inv255);
            const alpha = w00 * imgData[i00+3] * inv255 + w10 * imgData[i10+3] * inv255
                        + w01 * imgData[i01+3] * inv255 + w11 * imgData[i11+3] * inv255;

            const displayR = linearToSrgb(blendedLinearR);
            const displayG = linearToSrgb(blendedLinearG);
            const displayB = linearToSrgb(blendedLinearB);

            const f_dc_0 = (displayR - 0.5) / SH_C0;
            const f_dc_1 = (displayG - 0.5) / SH_C0;
            const f_dc_2 = (displayB - 0.5) / SH_C0;

            // ─── Depth sampling (bilinear from HR depth map) ─────────
            const dXF = (gx * invGridM1) * depthWM1;
            const dYF = (gy * invGridM1) * depthHM1;
            const dX0 = Math.min(Math.floor(dXF), depthWM1);
            const dY0 = Math.min(Math.floor(dYF), depthHM1);
            const dX1 = Math.min(dX0 + 1, depthWM1);
            const dY1 = Math.min(dY0 + 1, depthHM1);
            const dFx = dXF - dX0;
            const dFy = dYF - dY0;

            const dd00 = depthHR[dY0 * depthW + dX0];
            const dd10 = depthHR[dY0 * depthW + dX1];
            const dd01 = depthHR[dY1 * depthW + dX0];
            const dd11 = depthHR[dY1 * depthW + dX1];

            const disparity = (1 - dFx) * (1 - dFy) * dd00 + dFx * (1 - dFy) * dd10
                            + (1 - dFx) * dFy * dd01 + dFx * dFy * dd11;

            // ─── Disparity → depth (INVERSE, not linear) ─────────────
            // disparity: 1=close, 0=far
            // depth = scale / (disparity + eps)
            // Close objects: depth ≈ scale (small Z in camera space)
            // Far objects: depth ≈ scale/eps (large Z)
            const eps = 0.02;
            const z = sceneDepthScale / (disparity + eps);

            if (z < minDepth) minDepth = z;
            if (z > maxDepth) maxDepth = z;
            weightedDepthSum += z * Math.max(0.05, alpha);
            weightedDepthWeight += Math.max(0.05, alpha);

            // ─── Perspective-correct 3D position (pinhole model) ─────
            // This is THE key quality improvement: splats are placed where
            // a real camera would see them, not on a flat grid
            const u = imgXF;  // pixel coordinate
            const v = imgYF;
            const x = (u - cx) / fx * z;
            const y = (v - cy) / fy * z;

            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (z < minZ) minZ = z;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
            if (z > maxZ) maxZ = z;

            // ─── Depth-adaptive splat scale (perspective-correct) ────
            // In 3D, a pixel at depth z covers: pixelSize3D = z / focalLength
            // Splat must cover pixelCoverage pixels worth of 3D space
            const pixSize3D = z / fx;
            const scaleX = pixelCoverageX * pixSize3D * overlapFactor * 0.5;
            const scaleY = pixelCoverageY * pixSize3D * overlapFactor * 0.5;
            const scaleZ = Math.min(scaleX, scaleY) * 0.05; // Thin billboard

            const log_s0 = Math.log(Math.max(scaleX, 1e-8));
            const log_s1 = Math.log(Math.max(scaleY, 1e-8));
            const log_s2 = Math.log(Math.max(scaleZ, 1e-8));

            // ─── Opacity ─────────────────────────────────────────────
            const opacity = Math.min(0.995, Math.max(0.05, alpha * 0.98));
            const opacityLogit = Math.log(opacity / (1 - opacity));

            // ─── Write 14 floats ─────────────────────────────────────
            view.setFloat32(offset, x, true); offset += 4;
            view.setFloat32(offset, y, true); offset += 4;
            view.setFloat32(offset, z, true); offset += 4;
            view.setFloat32(offset, f_dc_0, true); offset += 4;
            view.setFloat32(offset, f_dc_1, true); offset += 4;
            view.setFloat32(offset, f_dc_2, true); offset += 4;
            view.setFloat32(offset, opacityLogit, true); offset += 4;
            view.setFloat32(offset, log_s0, true); offset += 4;
            view.setFloat32(offset, log_s1, true); offset += 4;
            view.setFloat32(offset, log_s2, true); offset += 4;
            view.setFloat32(offset, 1.0, true); offset += 4;  // rot_0 (w)
            view.setFloat32(offset, 0.0, true); offset += 4;  // rot_1 (x)
            view.setFloat32(offset, 0.0, true); offset += 4;  // rot_2 (y)
            view.setFloat32(offset, 0.0, true); offset += 4;  // rot_3 (z)
        }
    }

    return {
        plyBuffer: buffer,
        metadata: {
            gaussianCount: numPoints,
            depthWidth: depthW,
            depthHeight: depthH,
            minDepth,
            maxDepth,
            boundsMin: [minX, minY, minZ],
            boundsMax: [maxX, maxY, maxZ],
            center: [
                (minX + maxX) * 0.5,
                (minY + maxY) * 0.5,
                (minZ + maxZ) * 0.5,
            ],
            focusDepth: weightedDepthWeight > 0 ? weightedDepthSum / weightedDepthWeight : (minDepth + maxDepth) * 0.5,
            cameraSpace: true,
            frontBeta: 0.025,
            parallaxBeta: 0.065,
        },
    };
}

// ─── Main Message Handler ────────────────────────────────────────────────────
self.onmessage = async (event: MessageEvent<EnhancedWorkerMessage>) => {
    const {
        command,
        imageData,
        imageUrl,
        gridSize = 768,
        depthScale = 2.5,
        focalLengthPx,
        useBaseModel = true,
    } = event.data;

    if (command === 'preload') {
        try {
            await loadModel(useBaseModel);
            self.postMessage({ status: 'preload_complete' });
        } catch (error: any) {
            self.postMessage({ status: 'error', error: error?.message || 'Preload failed' });
        }
        return;
    }

    if (command !== 'generate') return;

    try {
        log(`Starting Enhanced generation: gridSize=${gridSize} (${gridSize * gridSize} splats), useBase=${useBaseModel}`);

        // ─── Step 1: Load image ──────────────────────────────────────
        self.postMessage({ status: 'processing', progress: 5, message: 'Loading image...' });

        let rawImage: any = null;
        let imgWidth: number;
        let imgHeight: number;
        let imgData: Uint8ClampedArray;

        if (imageUrl && typeof imageUrl === 'string') {
            rawImage = await RawImage.fromURL(imageUrl);
            imgWidth = rawImage.width;
            imgHeight = rawImage.height;

            const tempCanvas = new OffscreenCanvas(imgWidth, imgHeight);
            const ctx = tempCanvas.getContext('2d');
            if (!ctx) throw new Error('Failed to get canvas context');

            const response = await fetch(imageUrl);
            const blob = await response.blob();
            const imageBitmap = await createImageBitmap(blob);
            ctx.drawImage(imageBitmap, 0, 0);
            imgData = ctx.getImageData(0, 0, imgWidth, imgHeight).data;
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

        // ─── Step 2: Depth estimation ────────────────────────────────
        self.postMessage({
            status: 'processing',
            progress: 10,
            message: useBaseModel
                ? 'Running HD depth estimation (V2-Base, higher accuracy)...'
                : 'Running depth estimation...'
        });

        const { depth: depthData, width: depthWidth, height: depthHeight } =
            await estimateDepth(rawImage, useBaseModel);

        log(`Depth map: ${depthWidth}×${depthHeight}`);
        self.postMessage({ status: 'processing', progress: 55, message: 'Neural depth map computed' });

        // ─── Step 3: Edge-aware bilateral depth upsampling ───────────
        // Upsample depth to image resolution while preserving edges
        self.postMessage({ status: 'processing', progress: 58, message: 'Upsampling depth with edge preservation...' });

        let hrDepth: Float32Array;
        let hrDepthW: number, hrDepthH: number;

        if (depthWidth < imgWidth * 0.8 || depthHeight < imgHeight * 0.8) {
            log(`Bilateral upsampling: ${depthWidth}×${depthHeight} → ${imgWidth}×${imgHeight}`);
            hrDepth = bilateralUpsampleDepth(depthData, depthWidth, depthHeight, imgData, imgWidth, imgHeight);
            hrDepthW = imgWidth;
            hrDepthH = imgHeight;
            self.postMessage({ status: 'processing', progress: 65, message: 'Depth upsampled to full resolution' });
        } else {
            hrDepth = depthData;
            hrDepthW = depthWidth;
            hrDepthH = depthHeight;
        }

        // ─── Step 4: Focal length ────────────────────────────────────
        // Use exactly what was passed, or estimate from image dimensions
        // The service layer calculates this from EXIF/user input, same as standard pipeline
        const focal = focalLengthPx || Math.max(imgWidth, imgHeight) * 1.2;
        log(`Focal length: ${focal.toFixed(1)}px`);

        // ─── Step 5: Generate enhanced PLY ───────────────────────────
        self.postMessage({
            status: 'processing',
            progress: 68,
            message: `Generating ${(gridSize * gridSize / 1000).toFixed(0)}K enhanced splats...`
        });

        const imageDataObj = new ImageData(imgData, imgWidth, imgHeight);
        const { plyBuffer, metadata } = generateEnhancedPly(
            imageDataObj,
            hrDepth, hrDepthW, hrDepthH,
            gridSize,
            depthScale,
            focal
        );

        log(`PLY: ${(plyBuffer.byteLength / 1024 / 1024).toFixed(1)} MB, ${metadata.gaussianCount} splats, depth range [${metadata.minDepth.toFixed(3)}, ${metadata.maxDepth.toFixed(3)}]`);

        // ─── Step 6: Return ──────────────────────────────────────────
        self.postMessage({ status: 'processing', progress: 95, message: 'Finalizing...' });

        self.postMessage(
            {
                status: 'complete',
                progress: 100,
                plyBuffer,
                metadata,
                depthWidth: hrDepthW,
                depthHeight: hrDepthH,
            },
            [plyBuffer]
        );

        log('Enhanced generation complete', metadata);

    } catch (error: any) {
        console.error('[SharpEnhanced] Error:', error);
        self.postMessage({ status: 'error', error: error?.message || 'Unknown error' });
    }
};
