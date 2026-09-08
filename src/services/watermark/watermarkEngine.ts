/**
 * Gemini & Veo Watermark Removal Engine
 * Mathematical Reverse Alpha Blending with Resilient Multi-Scale 2D Normalized Cross-Correlation (NCC).
 * Handles arbitrary resolutions, cropped images, downscaled social media uploads, and JPEG compression ringing.
 */

// @ts-ignore - Untyped JS SDK imports
import {
  removeWatermarkFromImageDataSync,
  createWatermarkEngine,
  WatermarkEngine,
} from '@pilio/gemini-watermark-remover/image-data';

export interface WatermarkDetectionResult {
  detected: boolean;
  position?: { x: number; y: number; width: number; height: number } | null;
  size?: number | null;
  alphaGain?: number;
  confidence?: number;
  skipReason?: string | null;
  meta?: any;
  cleanedImageData?: ImageData | any;
}

const ALPHA_NOISE_FLOOR = 3 / 255;
const ALPHA_THRESHOLD = 0.002;
const MAX_ALPHA = 0.99;
const LOGO_VALUE = 255;

export const STANDARD_SIZES = [96, 64, 48, 44, 40, 36, 32] as const;

let cachedEnginePromise: Promise<any> | null = null;
const alphaMapCache = new Map<number, Float32Array>();

/**
 * Pre-warms the watermark engine and pre-caches Float32Array alpha maps for all standard sizes.
 */
export async function prewarmWatermarkEngine(): Promise<void> {
  if (alphaMapCache.size >= STANDARD_SIZES.length) return;
  try {
    if (!cachedEnginePromise) {
      cachedEnginePromise = createWatermarkEngine();
    }
    const engine = await cachedEnginePromise;
    for (const sz of STANDARD_SIZES) {
      if (!alphaMapCache.has(sz)) {
        const map = await engine.getAlphaMap(sz);
        if (map) alphaMapCache.set(sz, map);
      }
    }
  } catch (err) {
    console.warn('Watermark engine prewarm note:', err);
  }
}

// Automatically trigger background prewarming on module load
prewarmWatermarkEngine().catch(() => {});

/**
 * Lazily loads and caches the Float32Array alpha map for a given watermark size (e.g. 96, 48, 40, 36, 32).
 */
export async function getAlphaMapForSize(size: number | string = 96): Promise<Float32Array | null> {
  const numSize = typeof size === 'number' ? size : parseInt(size, 10);
  if (!isNaN(numSize) && alphaMapCache.has(numSize)) {
    return alphaMapCache.get(numSize)!;
  }
  try {
    if (!cachedEnginePromise) {
      cachedEnginePromise = createWatermarkEngine();
    }
    const engine = await cachedEnginePromise;
    const alphaMap = await engine.getAlphaMap(size);
    if (alphaMap) {
      if (!isNaN(numSize)) alphaMapCache.set(numSize, alphaMap);
      return alphaMap;
    }
  } catch (err) {
    console.warn('Failed to load alpha map for size:', size, err);
  }
  return null;
}

/**
 * Compute Normalized Cross-Correlation (NCC) between image patch and the alpha template.
 */
export function computePatchNcc(
  data: Uint8ClampedArray | Uint8Array,
  imageWidth: number,
  x: number,
  y: number,
  size: number,
  alphaMap: Float32Array
): number {
  let dot = 0;
  let sumA = 0;
  let sumI = 0;
  let sqA = 0;
  let sqI = 0;
  let cnt = 0;

  for (let r = 0; r < size; r += 2) {
    for (let c = 0; c < size; c += 2) {
      const a = alphaMap[r * size + c];
      const idx = ((y + r) * imageWidth + (x + c)) * 4;
      const lum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
      dot += a * lum;
      sumA += a;
      sumI += lum;
      sqA += a * a;
      sqI += lum * lum;
      cnt++;
    }
  }

  if (cnt < 12) return 0;
  const meanA = sumA / cnt;
  const meanI = sumI / cnt;
  const varA = sqA / cnt - meanA * meanA;
  const varI = sqI / cnt - meanI * meanI;
  if (varI < 6 || varA < 0.001) return 0;

  return (dot / cnt - meanA * meanI) / Math.sqrt(varA * varI);
}

/**
 * Ultra-fast in-place mathematical reverse alpha blending for a pre-cropped patch.
 * Includes two-pass residual edge cleanup for compressed JPEGs with boundary ringing.
 */
export function applyInverseAlphaPatch(
  patchImageData: ImageData,
  alphaMap: Float32Array,
  alphaGain = 1.0,
  logoValue = LOGO_VALUE
): void {
  const width = patchImageData.width;
  const height = patchImageData.height;
  const data = patchImageData.data;

  // Pass 1: Primary mathematical reverse alpha blending
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const imgIdx = (row * width + col) * 4;
      const alphaIdx = row * width + col;

      const rawAlpha = alphaMap[alphaIdx];
      const alphaMagnitude = Math.abs(rawAlpha);
      const effectiveLogo = rawAlpha < 0 ? 0 : logoValue;

      const signalAlpha = Math.max(0, alphaMagnitude - ALPHA_NOISE_FLOOR) * alphaGain;
      if (signalAlpha < ALPHA_THRESHOLD) continue;

      const alpha = Math.min(alphaMagnitude * alphaGain, MAX_ALPHA);
      const oneMinusAlpha = 1.0 - alpha;

      for (let c = 0; c < 3; c++) {
        const watermarked = data[imgIdx + c];
        const restored = (watermarked - alpha * effectiveLogo) / oneMinusAlpha;
        data[imgIdx + c] = Math.max(0, Math.min(255, Math.round(restored)));
      }
    }
  }

  // Pass 2: Secondary boundary fringe cleanup for JPEG quantization ringing
  const residualGain = alphaGain < 0.85 ? 0.12 : 0.06;
  for (let row = 0; row < height; row++) {
    for (let col = 0; col < width; col++) {
      const alphaIdx = row * width + col;
      const rawAlpha = alphaMap[alphaIdx];
      if (rawAlpha <= 0.01 || rawAlpha >= 0.35) continue;

      const alpha = Math.min(rawAlpha * residualGain, 0.50);
      const oneMinusAlpha = 1.0 - alpha;
      const imgIdx = (row * width + col) * 4;

      for (let c = 0; c < 3; c++) {
        const val = data[imgIdx + c];
        const restored = (val - alpha * logoValue) / oneMinusAlpha;
        data[imgIdx + c] = Math.max(0, Math.min(255, Math.round(restored)));
      }
    }
  }
}

/**
 * Multi-Scale 2D Sliding Window Template Matcher across bottom-right quadrant.
 * Evaluates candidate sizes and picks the one that minimizes residual watermark variance.
 */
export function findWatermarkByCorrelation(
  data: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number
): { x: number; y: number; size: number; alphaGain: number; score: number } | null {
  const searchMarginX = Math.min(Math.floor(width * 0.28), 380);
  const searchMarginY = Math.min(Math.floor(height * 0.30), 380);
  const startX = width - searchMarginX;
  const startY = height - searchMarginY;

  interface Candidate {
    x: number;
    y: number;
    size: number;
    alphaGain: number;
    ncc: number;
    residualVariance: number;
  }

  const validCandidates: Candidate[] = [];

  for (const sz of STANDARD_SIZES) {
    if (sz > width - startX || sz > height - startY) continue;
    const am = alphaMapCache.get(sz);
    if (!am) continue;

    let coarseBest = { score: -1, x: 0, y: 0 };
    const step = 2;

    for (let y = startY; y <= height - sz; y += step) {
      for (let x = startX; x <= width - sz; x += step) {
        // Enforce padding symmetry prior while accommodating 16:9 videos and non-square crops (up to 85px)
        const rMargin = width - (x + sz);
        const bMargin = height - (y + sz);
        if (Math.abs(rMargin - bMargin) > 85) continue;

        const ncc = computePatchNcc(data, width, x, y, sz, am);
        const asymPenalty = Math.max(0, Math.abs(rMargin - bMargin) - 20) * 0.0008;
        const adjScore = ncc - asymPenalty;
        if (adjScore > coarseBest.score) {
          coarseBest = { score: adjScore, x, y };
        }
      }
    }

    if (coarseBest.score < 0.30) continue;

    // Fine-tune around coarse peak with step 1
    let fineBest = { ...coarseBest };
    for (let y = Math.max(0, coarseBest.y - 4); y <= Math.min(height - sz, coarseBest.y + 4); y++) {
      for (let x = Math.max(0, coarseBest.x - 4); x <= Math.min(width - sz, coarseBest.x + 4); x++) {
        const ncc = computePatchNcc(data, width, x, y, sz, am);
        if (ncc > fineBest.score) {
          fineBest = { score: ncc, x, y };
        }
      }
    }

    if (fineBest.score < 0.32) continue;

    // Sample background luminance
    const bgSamples: number[] = [];
    const mid = Math.floor(sz / 2);
    const probeOffsets = [
      [-5, mid],
      [sz + 5, mid],
      [mid, -5],
      [mid, sz + 5],
      [-3, -3],
      [sz + 3, -3],
      [-3, sz + 3],
      [sz + 3, sz + 3],
    ];

    for (const [ox, oy] of probeOffsets) {
      const px = Math.max(0, Math.min(width - 1, fineBest.x + ox));
      const py = Math.max(0, Math.min(height - 1, fineBest.y + oy));
      const idx = (py * width + px) * 4;
      bgSamples.push((data[idx] + data[idx + 1] + data[idx + 2]) / 3);
    }
    bgSamples.sort((a, b) => a - b);
    const estBgLum = (bgSamples[2] + bgSamples[3] + bgSamples[4] + bgSamples[5]) / 4;

    // Sample watermark core luminance
    let coreSum = 0;
    let coreCount = 0;
    for (let r = mid - 2; r <= mid + 2; r++) {
      for (let c = mid - 2; c <= mid + 2; c++) {
        const idx = ((fineBest.y + r) * width + (fineBest.x + c)) * 4;
        coreSum += (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
        coreCount++;
      }
    }
    const coreLum = coreSum / coreCount;

    // Estimate alphaGain
    let estGain = 0.85;
    if (coreLum > estBgLum + 5) {
      const maxAlphaAtCore = am[mid * sz + mid] || 0.55;
      const rawGain = (coreLum - estBgLum) / (maxAlphaAtCore * (LOGO_VALUE - estBgLum));
      estGain = Math.max(0.40, Math.min(1.10, rawGain));
    }

    // Residual variance test with clamped trial subtraction
    let resSum = 0;
    let resSum2 = 0;
    let resCount = 0;
    for (let r = 0; r < sz; r++) {
      for (let c = 0; c < sz; c++) {
        const a = am[r * sz + c];
        if (a > 0.04) {
          const idx = ((fineBest.y + r) * width + (fineBest.x + c)) * 4;
          const lum = (data[idx] + data[idx + 1] + data[idx + 2]) / 3;
          const effA = Math.min(MAX_ALPHA, a * estGain);
          const restored = Math.max(0, Math.min(255, (lum - effA * LOGO_VALUE) / (1 - effA)));
          resSum += restored;
          resSum2 += restored * restored;
          resCount++;
        }
      }
    }
    const residualVariance =
      resCount > 0 ? (resSum2 - (resSum * resSum) / resCount) / resCount : 9999;

    validCandidates.push({
      x: fineBest.x,
      y: fineBest.y,
      size: sz,
      alphaGain: estGain,
      ncc: fineBest.score,
      residualVariance,
    });
  }

  if (validCandidates.length === 0) {
    return null;
  }

  // Sort candidates: prefer lowest residual variance among high-correlation matches
  // Include margin symmetry prior with soft penalty for 16:9 / letterboxed formats
  validCandidates.sort((a, b) => {
    const marginDiffA = Math.abs((width - (a.x + a.size)) - (height - (a.y + a.size)));
    const marginDiffB = Math.abs((width - (b.x + b.size)) - (height - (b.y + b.size)));
    const penaltyA = 1.0 + Math.min(2.0, marginDiffA / 50);
    const penaltyB = 1.0 + Math.min(2.0, marginDiffB / 50);
    const scoreA = (a.residualVariance / (a.ncc * a.ncc)) * penaltyA;
    const scoreB = (b.residualVariance / (b.ncc * b.ncc)) * penaltyB;
    return scoreA - scoreB;
  });

  const winner = validCandidates[0];

  return {
    x: winner.x,
    y: winner.y,
    size: winner.size,
    alphaGain: winner.alphaGain,
    score: winner.ncc,
  };
}

export interface ProcessedImageResult {
  file: File;
  name: string;
  originalUrl: string;
  cleanedUrl: string;
  cleanedBlob: Blob;
  width: number;
  height: number;
  detected: boolean;
  detectionMeta: WatermarkDetectionResult;
  processingTimeMs: number;
}

/**
 * Remove watermark from an ImageData object in-place or returning a new one.
 * Uses a hybrid Two-Tier engine:
 * 1. Fast catalog anchor check with NCC validation
 * 2. Fallback resilient Multi-Scale 2D NCC Sliding Window Scanner
 */
export function removeWatermarkFromImageData(imageData: ImageData): WatermarkDetectionResult {
  const width = imageData.width;
  const height = imageData.height;

  try {
    // Backup pristine corner pixels before Pilio modifies imageData in-place
    const cornerW = Math.min(width, 400);
    const cornerH = Math.min(height, 400);
    const cornerLeft = width - cornerW;
    const cornerTop = height - cornerH;
    const origCorner = new Uint8ClampedArray(cornerW * cornerH * 4);
    for (let r = 0; r < cornerH; r++) {
      for (let c = 0; c < cornerW; c++) {
        const srcIdx = ((cornerTop + r) * width + (cornerLeft + c)) * 4;
        const dstIdx = (r * cornerW + c) * 4;
        origCorner[dstIdx] = imageData.data[srcIdx];
        origCorner[dstIdx + 1] = imageData.data[srcIdx + 1];
        origCorner[dstIdx + 2] = imageData.data[srcIdx + 2];
        origCorner[dstIdx + 3] = imageData.data[srcIdx + 3];
      }
    }

    // ------------------------------------------------------------------------
    // Tier 1: Fast Catalog Anchor Check
    // ------------------------------------------------------------------------
    const tier1Result = removeWatermarkFromImageDataSync(imageData);
    const meta = tier1Result?.meta;

    if (meta?.applied && meta.position) {
      const pos = meta.position;
      const sz = meta.size || pos.width;
      const alphaMap = alphaMapCache.get(sz);

      // Verify whether the watermark actually existed at that catalog position using PRISTINE pixels
      let ncc = 0.0;
      if (alphaMap && pos.x >= cornerLeft && pos.y >= cornerTop) {
        let dot = 0, sumA = 0, sumI = 0, sqA = 0, sqI = 0, cnt = 0;
        for (let r = 0; r < sz; r += 2) {
          for (let c = 0; c < sz; c += 2) {
            const a = alphaMap[r * sz + c];
            const srcIdx = ((pos.y - cornerTop + r) * cornerW + (pos.x - cornerLeft + c)) * 4;
            const lum = (origCorner[srcIdx] + origCorner[srcIdx + 1] + origCorner[srcIdx + 2]) / 3;
            dot += a * lum;
            sumA += a;
            sumI += lum;
            sqA += a * a;
            sqI += lum * lum;
            cnt++;
          }
        }
        const meanA = sumA / cnt;
        const meanI = sumI / cnt;
        const varA = sqA / cnt - meanA * meanA;
        const varI = sqI / cnt - meanI * meanI;
        ncc = (varI >= 6 && varA >= 0.001) ? (dot / cnt - meanA * meanI) / Math.sqrt(varA * varI) : 0;
      }

      if (ncc >= 0.38) {
        const metaAny = meta as any;
        const isTooDark = metaAny.tooDark || metaAny.qualitySignals?.texture?.tooDark || (meta.alphaGain > 1.05);
        if (alphaMap && pos.x >= cornerLeft && pos.y >= cornerTop) {
          // Use our calibrated inverse alpha patch on PRISTINE pixels for clean, continuous restoration
          const patchData = new Uint8ClampedArray(sz * sz * 4);
          const patch =
            typeof ImageData !== 'undefined'
              ? new ImageData(patchData, sz, sz)
              : ({ width: sz, height: sz, data: patchData } as ImageData);
          for (let r = 0; r < sz; r++) {
            for (let c = 0; c < sz; c++) {
              const srcIdx = ((pos.y - cornerTop + r) * cornerW + (pos.x - cornerLeft + c)) * 4;
              const dstIdx = (r * sz + c) * 4;
              patch.data[dstIdx] = origCorner[srcIdx];
              patch.data[dstIdx + 1] = origCorner[srcIdx + 1];
              patch.data[dstIdx + 2] = origCorner[srcIdx + 2];
              patch.data[dstIdx + 3] = origCorner[srcIdx + 3];
            }
          }
          const gain = isTooDark
            ? Math.min(0.90, (meta.alphaGain || 1.0) * 0.78)
            : (meta.alphaGain || 1.0);
          applyInverseAlphaPatch(patch, alphaMap, gain);
          for (let r = 0; r < sz; r++) {
            for (let c = 0; c < sz; c++) {
              const srcIdx = (r * sz + c) * 4;
              const dstIdx = ((pos.y + r) * width + (pos.x + c)) * 4;
              imageData.data[dstIdx] = patch.data[srcIdx];
              imageData.data[dstIdx + 1] = patch.data[srcIdx + 1];
              imageData.data[dstIdx + 2] = patch.data[srcIdx + 2];
              imageData.data[dstIdx + 3] = patch.data[srcIdx + 3];
            }
          }
        } else if (tier1Result?.imageData?.data) {
          imageData.data.set(tier1Result.imageData.data);
        }
        return {
          detected: true,
          position: pos,
          size: sz,
          alphaGain: meta.alphaGain || 1.0,
          confidence: ncc,
          skipReason: null,
          meta,
          cleanedImageData: imageData,
        };
      }
      // If NCC was near zero (e.g. false catalog hit), restore pristine corner and fall through to Tier 2
      for (let r = 0; r < cornerH; r++) {
        for (let c = 0; c < cornerW; c++) {
          const srcIdx = (r * cornerW + c) * 4;
          const dstIdx = ((cornerTop + r) * width + (cornerLeft + c)) * 4;
          imageData.data[dstIdx] = origCorner[srcIdx];
          imageData.data[dstIdx + 1] = origCorner[srcIdx + 1];
          imageData.data[dstIdx + 2] = origCorner[srcIdx + 2];
          imageData.data[dstIdx + 3] = origCorner[srcIdx + 3];
        }
      }
    }

    // ------------------------------------------------------------------------
    // Tier 2: Resilient Multi-Scale 2D NCC Template Scanner
    // ------------------------------------------------------------------------
    const match = findWatermarkByCorrelation(imageData.data, width, height);

    if (match) {
      const sz = match.size;
      const alphaMap = alphaMapCache.get(sz);

      if (alphaMap) {
        // Extract sub-patch ImageData (environment-safe for Node/worker/browser)
        const patchData = new Uint8ClampedArray(sz * sz * 4);
        const patch =
          typeof ImageData !== 'undefined'
            ? new ImageData(patchData, sz, sz)
            : ({ width: sz, height: sz, data: patchData } as ImageData);
        for (let r = 0; r < sz; r++) {
          for (let c = 0; c < sz; c++) {
            const srcIdx = ((match.y + r) * width + (match.x + c)) * 4;
            const dstIdx = (r * sz + c) * 4;
            patch.data[dstIdx] = imageData.data[srcIdx];
            patch.data[dstIdx + 1] = imageData.data[srcIdx + 1];
            patch.data[dstIdx + 2] = imageData.data[srcIdx + 2];
            patch.data[dstIdx + 3] = imageData.data[srcIdx + 3];
          }
        }

        // Apply two-pass inverse alpha blending
        applyInverseAlphaPatch(patch, alphaMap, match.alphaGain);

        // Copy cleaned patch back into imageData.data
        for (let r = 0; r < sz; r++) {
          for (let c = 0; c < sz; c++) {
            const srcIdx = (r * sz + c) * 4;
            const dstIdx = ((match.y + r) * width + (match.x + c)) * 4;
            imageData.data[dstIdx] = patch.data[srcIdx];
            imageData.data[dstIdx + 1] = patch.data[srcIdx + 1];
            imageData.data[dstIdx + 2] = patch.data[srcIdx + 2];
            imageData.data[dstIdx + 3] = patch.data[srcIdx + 3];
          }
        }

        return {
          detected: true,
          position: { x: match.x, y: match.y, width: sz, height: sz },
          size: sz,
          alphaGain: match.alphaGain,
          confidence: match.score,
          skipReason: null,
          meta: { tier: 'tier2-ncc-sliding-window', ...match },
          cleanedImageData: imageData,
        };
      }
    }

    return {
      detected: false,
      skipReason: 'no-watermark-detected',
    };
  } catch (error) {
    console.error('Error in removeWatermarkFromImageData:', error);
    return {
      detected: false,
      skipReason: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Process a Canvas element to remove any visible Gemini / Veo watermark.
 */
export function removeWatermarkFromCanvas(canvas: HTMLCanvasElement): WatermarkDetectionResult {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not obtain 2D canvas context');

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const result = removeWatermarkFromImageData(imageData);

  if (result.detected) {
    if (result.cleanedImageData) {
      ctx.putImageData(result.cleanedImageData, 0, 0);
    } else {
      ctx.putImageData(imageData, 0, 0);
    }
  }

  return result;
}

/**
 * Load an image file into an HTMLImageElement safely.
 */
export function loadImageElement(fileOrUrl: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image: ' + err));

    if (typeof fileOrUrl === 'string') {
      img.src = fileOrUrl;
    } else {
      img.src = URL.createObjectURL(fileOrUrl);
    }
  });
}

/**
 * Process an image file, removing the Gemini watermark and returning a high-fidelity output.
 */
export async function processImageFile(
  file: File,
  outputFormat: 'image/png' | 'image/jpeg' | 'image/webp' = 'image/png',
  quality = 0.98
): Promise<ProcessedImageResult> {
  const startTime = performance.now();
  const originalUrl = URL.createObjectURL(file);

  // Ensure alpha templates are ready in memory
  await prewarmWatermarkEngine();

  const img = await loadImageElement(file);

  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(img, 0, 0);

  const detection = removeWatermarkFromCanvas(canvas);

  const cleanedBlob: Blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('Canvas toBlob conversion failed'));
      },
      outputFormat,
      quality
    );
  });

  const cleanedUrl = URL.createObjectURL(cleanedBlob);
  const processingTimeMs = Math.round(performance.now() - startTime);

  return {
    file,
    name: file.name,
    originalUrl,
    cleanedUrl,
    cleanedBlob,
    width: canvas.width,
    height: canvas.height,
    detected: detection.detected,
    detectionMeta: detection,
    processingTimeMs,
  };
}
