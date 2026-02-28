import * as tf from '@tensorflow/tfjs';

const MODEL_CONFIGS: Record<string, Record<number, ModelConfig>> = {
  'cugan': {
    2: {
      name: 'Real-CUGAN 2x',
      scaleFactor: 2,
      tileSize: 64,
      overlap: 12,
      modelUrl: '/models/realcugan/2x-conservative-64/model.json',
      cacheKey: 'realcugan-2x-conservative-64',
      size: '2.6MB'
    },
    4: {
      name: 'Real-CUGAN 4x',
      scaleFactor: 4,
      tileSize: 64,
      overlap: 12,
      modelUrl: '/models/realcugan/4x-conservative-64/model.json',
      cacheKey: 'realcugan-4x-conservative-64',
      size: '2.9MB'
    }
  },
  'esrgan-anime': {
    4: {
      name: 'Real-ESRGAN 4x Anime',
      scaleFactor: 4,
      tileSize: 64,
      overlap: 12,
      modelUrl: '/models/realesrgan/anime_plus-64/model.json',
      cacheKey: 'realesrgan-anime_plus-64',
      size: '9.2MB'
    }
  },
  'esrgan-general': {
    4: {
      name: 'Real-ESRGAN 4x General',
      scaleFactor: 4,
      tileSize: 64,
      overlap: 12,
      modelUrl: '/models/realesrgan/general_plus-64/model.json',
      cacheKey: 'realesrgan-general_plus-64',
      size: '34.2MB'
    }
  },
  'esrgan-8x': {
    8: {
      name: 'Real-ESRGAN 8x Experimental',
      scaleFactor: 8,
      tileSize: 64,
      overlap: 12,
      modelUrl: '/models/realesrgan/general_plus-64/model.json',
      cacheKey: 'realesrgan-general_plus-64',
      size: '34.2MB'
    }
  }
};

interface ModelConfig {
  name: string;
  scaleFactor: number;
  tileSize: number;
  overlap: number;
  modelUrl: string;
  cacheKey: string;
  size: string;
}

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
  tilesProcessed?: number;
  totalTiles?: number;
}

// Lightweight image buffer for tiled processing (adapted from web-realesrgan)
class ImgBuffer {
  width: number;
  height: number;
  data: Uint8Array;

  constructor(width: number, height: number, data?: Uint8Array) {
    this.width = width;
    this.height = height;
    this.data = data || new Uint8Array(width * height * 4);
  }

  copyRegionFrom(destX: number, destY: number, src: ImgBuffer, sx1: number, sy1: number, sx2: number, sy2: number) {
    const w = sx2 - sx1;
    for (let j = 0; j < sy2 - sy1; j++) {
      const dstIdx = ((destY + j) * this.width + destX) * 4;
      const srcIdx = ((sy1 + j) * src.width + sx1) * 4;
      this.data.set(src.data.subarray(srcIdx, srcIdx + w * 4), dstIdx);
    }
  }

  padToTileSize(tileSize: number) {
    let nw = Math.max(this.width, tileSize);
    let nh = Math.max(this.height, tileSize);
    if (nw === this.width && nh === this.height) return;
    const nd = new Uint8Array(nw * nh * 4);
    for (let y = 0; y < this.height; y++) {
      const ss = y * this.width * 4;
      nd.set(this.data.subarray(ss, ss + this.width * 4), y * nw * 4);
    }
    if (nw > this.width) {
      for (let y = 0; y < this.height; y++) {
        const edge = ((y * this.width) + this.width - 1) * 4;
        const px = this.data.subarray(edge, edge + 4);
        for (let x = this.width; x < nw; x++) nd.set(px, (y * nw + x) * 4);
      }
    }
    if (nh > this.height) {
      const lastRow = (this.height - 1) * nw * 4;
      const row = nd.subarray(lastRow, lastRow + nw * 4);
      for (let y = this.height; y < nh; y++) nd.set(row, y * nw * 4);
    }
    this.width = nw;
    this.height = nh;
    this.data = nd;
  }

  cropTo(w: number, h: number) {
    const nd = new Uint8Array(w * h * 4);
    for (let y = 0; y < h; y++) {
      const ss = y * this.width * 4;
      nd.set(this.data.subarray(ss, ss + w * 4), y * w * 4);
    }
    this.width = w;
    this.height = h;
    this.data = nd;
  }
}

async function upscaleTile(tile: ImgBuffer, model: tf.GraphModel): Promise<ImgBuffer> {
  const result = tf.tidy(() => {
    const imgData = new ImageData(tile.width, tile.height);
    imgData.data.set(tile.data);
    const tensor = tf.browser.fromPixels(imgData).div(255).toFloat().expandDims(0);
    return model.predict(tensor) as tf.Tensor;
  });

  const [, h, w] = result.shape;
  const clipped = tf.tidy(() => result.reshape([h!, w!, 3]).mul(255).cast('int32').clipByValue(0, 255));
  result.dispose();
  const pixels = await tf.browser.toPixels(clipped as tf.Tensor3D);
  clipped.dispose();
  return new ImgBuffer(w!, h!, new Uint8Array(pixels));
}

class RealESRGANUpscaler {
  private model: tf.GraphModel | null = null;
  private currentModelConfig: ModelConfig | null = null;
  private backend = 'webgl';
  private isInitialized = false;

  async initialize(): Promise<void> {
    try {
      await tf.setBackend('webgl');
      await tf.ready();
      this.backend = 'webgl';
      this.isInitialized = true;
      console.log(`TensorFlow.js initialized with ${this.backend} backend`);
    } catch (error) {
      console.error('Failed to initialize TensorFlow.js:', error);
      throw new Error('Failed to initialize AI backend');
    }
  }

  async loadModel(modelType: string, scaleFactor: number): Promise<void> {
    if (!this.isInitialized) await this.initialize();

    const group = (MODEL_CONFIGS as any)[modelType];
    if (!group) throw new Error(`Model type not available: ${modelType}`);
    const config = group[scaleFactor] as ModelConfig;
    if (!config) throw new Error(`Scale factor not available: ${modelType} ${scaleFactor}x`);

    this.currentModelConfig = config;

    self.postMessage({ status: 'model_loading', message: `Downloading ${config.name} (${config.size})...`, progress: 0 });

    try {
      let loaded: tf.GraphModel;
      try {
        loaded = await tf.loadGraphModel(`indexeddb://${config.cacheKey}`);
        console.log(`Loaded ${config.name} from IndexedDB cache`);
        self.postMessage({ status: 'model_loading', message: `Loaded from cache`, progress: 80 });
      } catch {
        console.log(`Downloading ${config.name} from server...`);
        loaded = await tf.loadGraphModel(config.modelUrl);
        await loaded.save(`indexeddb://${config.cacheKey}`);
        console.log(`Saved ${config.name} to IndexedDB cache`);
      }
      this.model = loaded;

      self.postMessage({ status: 'model_ready', message: `${config.name} loaded successfully`, progress: 100 });
    } catch (error) {
      console.error('Model loading failed:', error);
      throw new Error(`Failed to load ${config.name}: ${(error as Error).message}`);
    }
  }

  async upscaleImage(imageData: ImageData, scaleFactor: number): Promise<{ url: string; fileSize: number; stats: UpscalerStats }> {
    if (!this.currentModelConfig || !this.model) throw new Error('No model loaded');

    const startTime = performance.now();
    const { width: origW, height: origH } = imageData;
    const config = this.currentModelConfig;
    const effectiveFactor = config.scaleFactor;
    const tileSize = config.tileSize;
    const minLap = config.overlap;

    self.postMessage({ status: 'processing', message: 'Preparing image...', progress: 0 });

    const input = new ImgBuffer(origW, origH, new Uint8Array(imageData.data));
    const wOri = input.width;
    const hOri = input.height;
    input.padToTileSize(tileSize);
    const hasPad = input.width !== wOri || input.height !== hOri;

    const w = input.width;
    const h = input.height;
    const output = new ImgBuffer(w * effectiveFactor, h * effectiveFactor);

    let numX = 1;
    while ((tileSize * numX - w) / (numX - 1) < minLap) numX++;
    let numY = 1;
    while ((tileSize * numY - h) / (numY - 1) < minLap) numY++;

    const locsX = new Array(numX);
    const locsY = new Array(numY);
    const padL = new Array(numX);
    const padT = new Array(numY);
    const padR = new Array(numX);
    const padB = new Array(numY);

    const totLapX = tileSize * numX - w;
    const totLapY = tileSize * numY - h;
    const baseLapX = Math.floor(totLapX / (numX - 1));
    const baseLapY = Math.floor(totLapY / (numY - 1));
    const extraLapX = totLapX - baseLapX * (numX - 1);
    const extraLapY = totLapY - baseLapY * (numY - 1);

    locsX[0] = 0;
    for (let i = 1; i < numX; i++) locsX[i] = locsX[i - 1] + tileSize - baseLapX - (i <= extraLapX ? 1 : 0);
    locsY[0] = 0;
    for (let i = 1; i < numY; i++) locsY[i] = locsY[i - 1] + tileSize - baseLapY - (i <= extraLapY ? 1 : 0);

    padL[0] = 0; padT[0] = 0;
    padR[numX - 1] = 0; padB[numY - 1] = 0;
    for (let i = 1; i < numX; i++) padL[i] = Math.floor((locsX[i - 1] + tileSize - locsX[i]) / 2);
    for (let i = 1; i < numY; i++) padT[i] = Math.floor((locsY[i - 1] + tileSize - locsY[i]) / 2);
    for (let i = 0; i < numX - 1; i++) padR[i] = locsX[i] + tileSize - locsX[i + 1] - padL[i + 1];
    for (let i = 0; i < numY - 1; i++) padB[i] = locsY[i] + tileSize - locsY[i + 1] - padT[i + 1];

    const totalTiles = numX * numY;
    let processed = 0;

    for (let i = 0; i < numX; i++) {
      for (let j = 0; j < numY; j++) {
        const x1 = locsX[i], y1 = locsY[j];
        const x2 = x1 + tileSize, y2 = y1 + tileSize;

        const tile = new ImgBuffer(tileSize, tileSize);
        tile.copyRegionFrom(0, 0, input, x1, y1, x2, y2);

        const scaled = await upscaleTile(tile, this.model);

        output.copyRegionFrom(
          (x1 + padL[i]) * effectiveFactor,
          (y1 + padT[j]) * effectiveFactor,
          scaled,
          padL[i] * effectiveFactor,
          padT[j] * effectiveFactor,
          scaled.width - padR[i] * effectiveFactor,
          scaled.height - padB[j] * effectiveFactor
        );

        processed++;
        const pct = Math.round((processed / totalTiles) * 100);
        self.postMessage({ status: 'processing', message: `Processing tile ${processed}/${totalTiles}...`, progress: pct });
      }
    }

    if (hasPad) output.cropTo(wOri * effectiveFactor, hOri * effectiveFactor);

    // For 8x: run the 4x model a second time on the already-upscaled result
    let finalOutput = output;
    if (scaleFactor === 8 && effectiveFactor === 4) {
      self.postMessage({ status: 'processing', message: 'Running second 4x pass for 8x total...', progress: 50 });

      const pass2Input = new ImgBuffer(output.width, output.height, new Uint8Array(output.data));
      pass2Input.padToTileSize(tileSize);
      const p2w = pass2Input.width, p2h = pass2Input.height;
      const pass2Out = new ImgBuffer(p2w * effectiveFactor, p2h * effectiveFactor);

      let numX2 = 1;
      while ((tileSize * numX2 - p2w) / (numX2 - 1) < minLap) numX2++;
      let numY2 = 1;
      while ((tileSize * numY2 - p2h) / (numY2 - 1) < minLap) numY2++;

      const locsX2 = new Array(numX2); const locsY2 = new Array(numY2);
      const padL2 = new Array(numX2); const padT2 = new Array(numY2);
      const padR2 = new Array(numX2); const padB2 = new Array(numY2);

      const tLX2 = tileSize * numX2 - p2w;
      const tLY2 = tileSize * numY2 - p2h;
      const bLX2 = Math.floor(tLX2 / (numX2 - 1));
      const bLY2 = Math.floor(tLY2 / (numY2 - 1));
      const eLX2 = tLX2 - bLX2 * (numX2 - 1);
      const eLY2 = tLY2 - bLY2 * (numY2 - 1);

      locsX2[0] = 0;
      for (let i = 1; i < numX2; i++) locsX2[i] = locsX2[i - 1] + tileSize - bLX2 - (i <= eLX2 ? 1 : 0);
      locsY2[0] = 0;
      for (let i = 1; i < numY2; i++) locsY2[i] = locsY2[i - 1] + tileSize - bLY2 - (i <= eLY2 ? 1 : 0);

      padL2[0] = 0; padT2[0] = 0;
      padR2[numX2 - 1] = 0; padB2[numY2 - 1] = 0;
      for (let i = 1; i < numX2; i++) padL2[i] = Math.floor((locsX2[i - 1] + tileSize - locsX2[i]) / 2);
      for (let i = 1; i < numY2; i++) padT2[i] = Math.floor((locsY2[i - 1] + tileSize - locsY2[i]) / 2);
      for (let i = 0; i < numX2 - 1; i++) padR2[i] = locsX2[i] + tileSize - locsX2[i + 1] - padL2[i + 1];
      for (let i = 0; i < numY2 - 1; i++) padB2[i] = locsY2[i] + tileSize - locsY2[i + 1] - padT2[i + 1];

      const total2 = numX2 * numY2;
      let proc2 = 0;
      for (let i = 0; i < numX2; i++) {
        for (let j2 = 0; j2 < numY2; j2++) {
          const x1 = locsX2[i], y1 = locsY2[j2];
          const tile = new ImgBuffer(tileSize, tileSize);
          tile.copyRegionFrom(0, 0, pass2Input, x1, y1, x1 + tileSize, y1 + tileSize);
          const scaled = await upscaleTile(tile, this.model);
          pass2Out.copyRegionFrom(
            (x1 + padL2[i]) * effectiveFactor, (y1 + padT2[j2]) * effectiveFactor,
            scaled, padL2[i] * effectiveFactor, padT2[j2] * effectiveFactor,
            scaled.width - padR2[i] * effectiveFactor, scaled.height - padB2[j2] * effectiveFactor
          );
          proc2++;
          self.postMessage({ status: 'processing', message: `Pass 2: tile ${proc2}/${total2}...`, progress: 50 + Math.round((proc2 / total2) * 50) });
        }
      }
      pass2Out.cropTo(wOri * 8, hOri * 8);
      finalOutput = pass2Out;
    }

    const finalW = finalOutput.width;
    const finalH = finalOutput.height;
    const canvas = new OffscreenCanvas(finalW, finalH);
    const ctx = canvas.getContext('2d')!;
    const outImgData = ctx.createImageData(finalW, finalH);
    outImgData.data.set(finalOutput.data);
    ctx.putImageData(outImgData, 0, 0);

    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const url = URL.createObjectURL(blob);
    const endTime = performance.now();

    const stats: UpscalerStats = {
      originalWidth: origW,
      originalHeight: origH,
      upscaledWidth: finalW,
      upscaledHeight: finalH,
      processingTime: (endTime - startTime) / 1000,
      scaleFactor: scaleFactor === 8 ? 8 : effectiveFactor,
      modelName: this.currentModelConfig.name,
      backend: this.backend,
      fileSize: this.formatFileSize(blob.size),
      tilesProcessed: processed,
      totalTiles: totalTiles,
    };

    return { url, fileSize: blob.size, stats };
  }

  private formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
}

const upscaler = new RealESRGANUpscaler();

self.onmessage = async (event: MessageEvent) => {
  const { command, imageData, scaleFactor, modelType } = event.data;

  try {
    switch (command) {
      case 'initialize':
        await upscaler.initialize();
        self.postMessage({ status: 'worker_initialized', message: 'AI backend ready' });
        break;

      case 'loadModel':
        await upscaler.loadModel(modelType, scaleFactor);
        break;

      case 'upscale': {
        if (!imageData) throw new Error('No image data provided');

        // Auto-load the model if not loaded yet
        await upscaler.loadModel(modelType, scaleFactor);

        // The page sends imageData as { dataUrl, width, height } — decode into ImageData
        const bitmap = await createImageBitmap(await (await fetch(imageData.dataUrl)).blob());
        const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(bitmap, 0, 0);
        const realImageData = ctx.getImageData(0, 0, bitmap.width, bitmap.height);

        const result = await upscaler.upscaleImage(realImageData, scaleFactor);
        self.postMessage({
          status: 'complete',
          message: 'Upscaling complete',
          upscaledImageUrl: result.url,
          fileSize: result.fileSize,
          stats: result.stats,
          progress: 100
        });
        break;
      }

      default:
        throw new Error(`Unknown command: ${command}`);
    }
  } catch (error) {
    console.error('Upscaler worker error:', error);
    self.postMessage({
      status: 'error',
      message: (error as Error).message,
      error: (error as Error).message
    });
  }
};
