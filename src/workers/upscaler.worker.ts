import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';

// ---------------------------------------------------------------------------
// Tile-aware image helper (ported from web-realesrgan reference project)
// ---------------------------------------------------------------------------
class TileImage {
  width: number;
  height: number;
  data: Uint8Array;

  constructor(width: number, height: number, data?: Uint8Array) {
    this.width = width;
    this.height = height;
    this.data = data ?? new Uint8Array(width * height * 4);
  }

  getImageCrop(
    x: number, y: number,
    src: TileImage,
    x1: number, y1: number, x2: number, y2: number,
  ) {
    const cropW = x2 - x1;
    for (let j = 0; j < y2 - y1; j++) {
      const dstIdx = (y + j) * this.width * 4 + x * 4;
      const srcIdx = (y1 + j) * src.width * 4 + x1 * 4;
      this.data.set(src.data.subarray(srcIdx, srcIdx + cropW * 4), dstIdx);
    }
  }

  padToTileSize(tileSize: number) {
    let newW = Math.max(this.width, tileSize);
    let newH = Math.max(this.height, tileSize);
    if (newW === this.width && newH === this.height) return;

    const newData = new Uint8Array(newW * newH * 4);
    for (let y = 0; y < this.height; y++) {
      const s = y * this.width * 4;
      newData.set(this.data.subarray(s, s + this.width * 4), y * newW * 4);
    }
    // Edge-replicate padding (right)
    if (newW > this.width) {
      for (let y = 0; y < this.height; y++) {
        const lastPixel = this.data.subarray(
          y * this.width * 4 + (this.width - 1) * 4,
          y * this.width * 4 + this.width * 4,
        );
        for (let x = this.width; x < newW; x++) {
          newData.set(lastPixel, y * newW * 4 + x * 4);
        }
      }
    }
    // Edge-replicate padding (bottom)
    if (newH > this.height) {
      const lastRow = newData.subarray(
        (this.height - 1) * newW * 4,
        this.height * newW * 4,
      );
      for (let y = this.height; y < newH; y++) {
        newData.set(lastRow, y * newW * 4);
      }
    }
    this.width = newW;
    this.height = newH;
    this.data = newData;
  }

  cropToOriginalSize(w: number, h: number) {
    const nd = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      const s = y * this.width * 4;
      nd.set(this.data.subarray(s, s + w * 4), y * w * 4);
    }
    this.width = w;
    this.height = h;
    this.data = nd;
  }
}

// ---------------------------------------------------------------------------
// Model configuration
// ---------------------------------------------------------------------------
interface ModelConfig {
  name: string;
  scaleFactor: number;
  tileSize: number;
  modelUrl: string;
  cacheKey: string;
  sizeLabel: string;
}

const TILE_SIZE = 64;
const MIN_OVERLAP = 12;

function getModelConfig(modelType: string, scaleFactor: number): ModelConfig {
  const configs: Record<string, ModelConfig> = {
    'cugan-2': {
      name: 'Real-CUGAN 2x',
      scaleFactor: 2,
      tileSize: TILE_SIZE,
      modelUrl: `/realcugan/2x-conservative-${TILE_SIZE}/model.json`,
      cacheKey: `realcugan-2x-conservative-${TILE_SIZE}`,
      sizeLabel: '2.6 MB',
    },
    'cugan-4': {
      name: 'Real-CUGAN 4x',
      scaleFactor: 4,
      tileSize: TILE_SIZE,
      modelUrl: `/realcugan/4x-conservative-${TILE_SIZE}/model.json`,
      cacheKey: `realcugan-4x-conservative-${TILE_SIZE}`,
      sizeLabel: '2.9 MB',
    },
    'esrgan-anime-4': {
      name: 'Real-ESRGAN 4x Anime',
      scaleFactor: 4,
      tileSize: TILE_SIZE,
      modelUrl: `/realesrgan/anime_plus-${TILE_SIZE}/model.json`,
      cacheKey: `realesrgan-anime_plus-${TILE_SIZE}`,
      sizeLabel: '9.2 MB',
    },
    'esrgan-general-4': {
      name: 'Real-ESRGAN 4x General',
      scaleFactor: 4,
      tileSize: TILE_SIZE,
      modelUrl: `/realesrgan/general_plus-${TILE_SIZE}/model.json`,
      cacheKey: `realesrgan-general_plus-${TILE_SIZE}`,
      sizeLabel: '34.2 MB',
    },
    'esrgan-8x-8': {
      name: 'Real-ESRGAN 8x Experimental',
      scaleFactor: 4,  // internally uses 4x model, applied twice
      tileSize: TILE_SIZE,
      modelUrl: `/realesrgan/general_plus-${TILE_SIZE}/model.json`,
      cacheKey: `realesrgan-general_plus-${TILE_SIZE}`,
      sizeLabel: '34.2 MB',
    },
  };

  return configs[`${modelType}-${scaleFactor}`] ??
         configs[`${modelType}-4`] ??
         configs['cugan-2'];
}

// ---------------------------------------------------------------------------
// Single-tile upscale via TF.js model
// ---------------------------------------------------------------------------
function upscaleTile(tile: TileImage, model: tf.GraphModel): TileImage {
  const imgData = new ImageData(
    new Uint8ClampedArray(tile.data.buffer, tile.data.byteOffset, tile.data.byteLength),
    tile.width,
    tile.height,
  );

  const pixels: Int32Array = tf.tidy(() => {
    const tensor = tf.browser.fromPixels(imgData).div(255).toFloat().expandDims(0);
    const result = model.predict(tensor) as tf.Tensor;
    const [, h, w] = result.shape as number[];
    return result.reshape([h, w, 3]).mul(255).clipByValue(0, 255).cast('int32').dataSync() as Int32Array;
  });

  // Derive output dimensions from the model's scale factor
  const totalPx = pixels.length / 3;
  const ratio = Math.round(Math.sqrt(totalPx / (tile.width * tile.height)));
  const w = tile.width * ratio;
  const h = tile.height * ratio;

  const out = new TileImage(w, h);
  for (let i = 0; i < w * h; i++) {
    out.data[i * 4] = pixels[i * 3];
    out.data[i * 4 + 1] = pixels[i * 3 + 1];
    out.data[i * 4 + 2] = pixels[i * 3 + 2];
    out.data[i * 4 + 3] = 255;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Tile-based upscale (from web-realesrgan reference)
// ---------------------------------------------------------------------------
async function enlargeImage(
  model: tf.GraphModel,
  inputImg: TileImage,
  factor: number,
  inputSize: number,
  minLap: number,
  onProgress: (pct: number) => void,
): Promise<TileImage> {
  const { width, height } = inputImg;
  const output = new TileImage(width * factor, height * factor);

  let numX = 1;
  while ((inputSize * numX - width) / Math.max(numX - 1, 1) < minLap && numX * inputSize < width + inputSize) numX++;
  if (numX === 1 && width > inputSize) {
    numX = Math.ceil(width / (inputSize - minLap));
  }

  let numY = 1;
  while ((inputSize * numY - height) / Math.max(numY - 1, 1) < minLap && numY * inputSize < height + inputSize) numY++;
  if (numY === 1 && height > inputSize) {
    numY = Math.ceil(height / (inputSize - minLap));
  }

  const locsX = computeTileLocations(numX, inputSize, width);
  const locsY = computeTileLocations(numY, inputSize, height);

  const padLeft = new Array(numX).fill(0);
  const padTop = new Array(numY).fill(0);
  const padRight = new Array(numX).fill(0);
  const padBottom = new Array(numY).fill(0);

  for (let i = 1; i < numX; i++) padLeft[i] = Math.floor((locsX[i - 1] + inputSize - locsX[i]) / 2);
  for (let i = 1; i < numY; i++) padTop[i] = Math.floor((locsY[i - 1] + inputSize - locsY[i]) / 2);
  for (let i = 0; i < numX - 1; i++) padRight[i] = locsX[i] + inputSize - locsX[i + 1] - padLeft[i + 1];
  for (let i = 0; i < numY - 1; i++) padBottom[i] = locsY[i] + inputSize - locsY[i + 1] - padTop[i + 1];

  const total = numX * numY;
  let current = 0;

  for (let i = 0; i < numX; i++) {
    for (let j = 0; j < numY; j++) {
      const x1 = locsX[i];
      const y1 = locsY[j];

      const tile = new TileImage(inputSize, inputSize);
      tile.getImageCrop(0, 0, inputImg, x1, y1, x1 + inputSize, y1 + inputSize);

      const scaled = upscaleTile(tile, model);

      output.getImageCrop(
        (x1 + padLeft[i]) * factor,
        (y1 + padTop[j]) * factor,
        scaled,
        padLeft[i] * factor,
        padTop[j] * factor,
        scaled.width - padRight[i] * factor,
        scaled.height - padBottom[j] * factor,
      );

      current++;
      onProgress((current / total) * 100);

      // Yield to avoid blocking the worker thread
      await new Promise(r => setTimeout(r, 0));
    }
  }
  return output;
}

function computeTileLocations(num: number, tileSize: number, imageSize: number): number[] {
  if (num === 1) return [0];
  const locs = new Array(num);
  const totalLap = tileSize * num - imageSize;
  const baseLap = Math.floor(totalLap / (num - 1));
  const extraLap = totalLap - baseLap * (num - 1);
  locs[0] = 0;
  for (let i = 1; i < num; i++) {
    locs[i] = locs[i - 1] + tileSize - baseLap - (i <= extraLap ? 1 : 0);
  }
  return locs;
}

// ---------------------------------------------------------------------------
// Main upscaler class
// ---------------------------------------------------------------------------
class RealESRGANUpscaler {
  private model: tf.GraphModel | null = null;
  private currentConfig: ModelConfig | null = null;
  private backend = 'webgl';
  private isInitialized = false;

  async initialize(preferredBackend?: string): Promise<void> {
    try {
      // Build ordered list: preferred first, then fastest-to-slowest
      const order = preferredBackend
        ? [preferredBackend, 'webgpu', 'webgl', 'cpu']
        : ['webgpu', 'webgl', 'cpu'];
      // Deduplicate while preserving order
      const seen: Record<string, boolean> = {};
      const backends = order.filter(b => { if (seen[b]) return false; seen[b] = true; return true; });

      for (const name of backends) {
        if (await this.tryBackend(name)) break;
      }

      this.isInitialized = true;
      console.log(`TensorFlow.js initialized with ${this.backend} backend`);
    } catch (error) {
      console.error('Failed to initialize TF.js:', error);
      throw new Error('Failed to initialize AI backend');
    }
  }

  private async tryBackend(name: string): Promise<boolean> {
    try {
      if (name === 'webgpu') {
        if (typeof navigator === 'undefined' || !('gpu' in navigator)) {
          throw new Error('WebGPU API not available');
        }
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (!adapter) throw new Error('No WebGPU adapter');
      }

      if (name === 'webgl') {
        const c = new OffscreenCanvas(1, 1);
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        if (!gl) throw new Error('No WebGL context');
      }

      await tf.setBackend(name);
      await tf.ready();

      // Warmup: run a small kernel to verify the backend really works
      if (name !== 'cpu') {
        const t = tf.zeros([1, 4, 4, 3]);
        const r = tf.image.resizeBilinear(t as tf.Tensor4D, [8, 8]);
        r.dataSync();
        r.dispose();
        t.dispose();
      }

      this.backend = name;
      return true;
    } catch (e) {
      console.warn(`Backend "${name}" not usable, skipping:`, e);
      return false;
    }
  }

  async loadModel(modelType: string, scaleFactor: number): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    const config = getModelConfig(modelType, scaleFactor);
    this.currentConfig = config;

    // Skip reload if same model is already loaded
    if (this.model && this.currentConfig.cacheKey === config.cacheKey) {
      self.postMessage({ status: 'model_ready', message: `${config.name} ready`, progress: 100 });
      return;
    }

    self.postMessage({
      status: 'model_loading',
      message: `Loading ${config.name} (${config.sizeLabel})...`,
      progress: 0,
    });

    // Try IndexedDB cache first, then fetch from server
    try {
      this.model = await tf.loadGraphModel(`indexeddb://${config.cacheKey}`);
      console.log(`Loaded ${config.name} from IndexedDB cache`);
    } catch {
      console.log(`Downloading ${config.name} from server...`);
      self.postMessage({
        status: 'model_loading',
        message: `Downloading ${config.name} (${config.sizeLabel})...`,
        progress: 10,
      });
      this.model = await tf.loadGraphModel(config.modelUrl);
      // Cache for next time
      try {
        await this.model.save(`indexeddb://${config.cacheKey}`);
      } catch (e) {
        console.warn('Failed to cache model in IndexedDB:', e);
      }
    }

    self.postMessage({ status: 'model_ready', message: `${config.name} loaded`, progress: 100 });
  }

  async upscaleImage(
    imageData: ImageData,
    requestedScale: number,
    modelType: string,
  ): Promise<{ url: string; fileSize: number; stats: UpscalerStats }> {
    if (!this.model || !this.currentConfig) throw new Error('No model loaded');

    const startTime = performance.now();
    const { width: origW, height: origH } = imageData;

    // Build a TileImage from the browser ImageData
    const input = new TileImage(origW, origH, new Uint8Array(imageData.data.buffer.slice(0)));
    input.padToTileSize(this.currentConfig.tileSize);
    const wasPadded = input.width !== origW || input.height !== origH;

    const factor = this.currentConfig.scaleFactor;
    const is8x = modelType === 'esrgan-8x' && requestedScale === 8;

    self.postMessage({ status: 'processing', message: 'Upscaling image...', progress: 0 });

    let output = await enlargeImage(
      this.model, input, factor, this.currentConfig.tileSize, MIN_OVERLAP,
      (pct) => {
        const overall = is8x ? pct * 0.5 : pct;
        self.postMessage({
          status: 'processing',
          message: is8x ? `Pass 1/2 – ${Math.round(pct)}%` : `Processing – ${Math.round(pct)}%`,
          progress: Math.round(overall),
        });
      },
    );

    if (wasPadded) output.cropToOriginalSize(origW * factor, origH * factor);

    // 8x experimental: run a second pass
    if (is8x) {
      self.postMessage({ status: 'processing', message: 'Pass 2/2 – starting...', progress: 50 });
      output.padToTileSize(this.currentConfig.tileSize);
      const wasPadded2 = output.width !== origW * factor || output.height !== origH * factor;
      output = await enlargeImage(
        this.model, output, factor, this.currentConfig.tileSize, MIN_OVERLAP,
        (pct) => {
          self.postMessage({
            status: 'processing',
            message: `Pass 2/2 – ${Math.round(pct)}%`,
            progress: Math.round(50 + pct * 0.5),
          });
        },
      );
      if (wasPadded2) output.cropToOriginalSize(origW * factor * factor, origH * factor * factor);
    }

    // Convert output to canvas → blob → objectURL
    const finalFactor = is8x ? factor * factor : factor;
    const outW = origW * finalFactor;
    const outH = origH * finalFactor;
    const canvas = new OffscreenCanvas(outW, outH);
    const ctx = canvas.getContext('2d')!;
    const outImageData = new ImageData(new Uint8ClampedArray(output.data.buffer), outW, outH);
    ctx.putImageData(outImageData, 0, 0);

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const processingTime = (performance.now() - startTime) / 1000;

    const stats: UpscalerStats = {
      originalWidth: origW,
      originalHeight: origH,
      upscaledWidth: outW,
      upscaledHeight: outH,
      processingTime,
      scaleFactor: is8x ? 8 : factor,
      modelName: this.currentConfig.name + (is8x ? ' (×2 pass)' : ''),
      backend: this.backend,
      fileSize: formatFileSize(blob.size),
    };

    return { url, fileSize: blob.size, stats };
  }
}

// ---------------------------------------------------------------------------
// Types & helpers
// ---------------------------------------------------------------------------
interface UpscalerStats {
  originalWidth: number;
  originalHeight: number;
  upscaledWidth: number;
  upscaledHeight: number;
  processingTime: number;
  scaleFactor: number;
  modelName: string;
  backend: string;
  fileSize?: string;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ---------------------------------------------------------------------------
// Worker entry-point
// ---------------------------------------------------------------------------
const upscaler = new RealESRGANUpscaler();

self.onmessage = async (event: MessageEvent) => {
  const { command, imageData, scaleFactor, modelType, backend } = event.data;

  try {
    switch (command) {
      case 'initialize':
        await upscaler.initialize(backend);
        self.postMessage({ status: 'worker_initialized', message: 'AI upscaler ready' });
        break;

      case 'upscale': {
        if (!imageData || !scaleFactor || !modelType) {
          throw new Error('Missing required parameters');
        }

        await upscaler.loadModel(modelType, scaleFactor);

        self.postMessage({ status: 'processing', message: 'Decoding image...', progress: 0 });

        // Decode the incoming dataURL → ImageData
        const response = await fetch(imageData.dataUrl);
        const blob = await response.blob();
        const bitmap = await createImageBitmap(blob);
        const c = new OffscreenCanvas(bitmap.width, bitmap.height);
        const cx = c.getContext('2d');
        if (!cx) throw new Error('Canvas context unavailable');
        cx.drawImage(bitmap, 0, 0);
        const preparedImageData = cx.getImageData(0, 0, bitmap.width, bitmap.height);

        const { url, stats } = await upscaler.upscaleImage(preparedImageData, scaleFactor, modelType);

        self.postMessage({ status: 'complete', upscaledImageUrl: url, stats });
        break;
      }

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error('Upscaler Worker Error:', error);
    self.postMessage({ status: 'error', error: (error as Error).message });
  }
};

self.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled rejection in worker:', event.reason);
  self.postMessage({ status: 'error', error: `Unhandled: ${event.reason}` });
});
