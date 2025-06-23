/**
 * GPU-Accelerated Background Removal Worker
 * Uses U²-Net and RemBG models with WebGPU/WebGL acceleration
 */

import { ModelManager, MODEL_CONFIGS } from '../utils/modelManager';
import { GPUDetector } from '../utils/gpuDetection';
import { getErrorMessage } from '../utils/errorHandler';

interface BackgroundRemovalMessage {
  type: 'INIT' | 'REMOVE_BACKGROUND' | 'SWITCH_MODEL' | 'GET_STATUS';
  data?: any;
  modelType?: 'u2net' | 'rembg';
  imageData?: ImageData;
  options?: {
    outputType?: 'mask' | 'cutout' | 'background';
    edgeSmoothing?: boolean;
    matting?: boolean; // For better edge quality
  };
}

class GPUBackgroundRemovalWorker {
  private modelManager: ModelManager;
  private gpuDetector: GPUDetector;
  private currentModel: 'u2net' | 'rembg' = 'rembg'; // Default to faster RemBG
  private initialized = false;

  constructor() {
    this.modelManager = ModelManager.getInstance();
    this.gpuDetector = GPUDetector.getInstance();
  }

  async initialize() {
    if (this.initialized) return;

    try {
      // Initialize GPU detection and model manager
      const gpuInfo = await this.gpuDetector.detectGPU();
      await this.modelManager.initialize();

      // Choose default model based on GPU capability
      if (gpuInfo.tier === 'high' && gpuInfo.isDiscrete) {
        this.currentModel = 'u2net'; // Higher quality for powerful GPUs
      } else {
        this.currentModel = 'rembg'; // Faster for lower-end hardware
      }

      this.initialized = true;

      self.postMessage({
        type: 'INIT_COMPLETE',
        data: {
          gpuInfo,
          backend: this.modelManager.getBackend(),
          defaultModel: this.currentModel,
          availableModels: ['u2net', 'rembg']
        }
      });

      console.log(`🎭 Background Removal Worker initialized with ${this.currentModel} model`);
    } catch (error) {
      console.error('Failed to initialize background removal worker:', error);
      self.postMessage({
        type: 'INIT_ERROR',
        error: getErrorMessage(error)
      });
    }
  }

  async switchModel(modelType: 'u2net' | 'rembg') {
    if (modelType === this.currentModel) return;

    try {
      // Preload new model
      await this.modelManager.loadModel(modelType, (progress) => {
        self.postMessage({
          type: 'MODEL_LOADING_PROGRESS',
          progress,
          modelType
        });
      });

      this.currentModel = modelType;

      self.postMessage({
        type: 'MODEL_SWITCHED',
        modelType: this.currentModel
      });

      console.log(`🔄 Switched to ${modelType} model`);
    } catch (error) {
      console.error(`Failed to switch to ${modelType}:`, error);
      self.postMessage({
        type: 'MODEL_SWITCH_ERROR',
        error: getErrorMessage(error),
        modelType
      });
    }
  }

  async removeBackground(imageData: ImageData, options: any = {}) {
    if (!this.initialized) {
      throw new Error('Worker not initialized');
    }

    try {
      const outputType = options.outputType || 'cutout';
      const edgeSmoothing = options.edgeSmoothing !== false;
      const matting = options.matting || false;

      self.postMessage({
        type: 'REMOVAL_STARTED',
        modelType: this.currentModel
      });

      // Load model if not already loaded
      await this.modelManager.loadModel(this.currentModel, (progress) => {
        self.postMessage({
          type: 'MODEL_LOADING_PROGRESS',
          progress,
          modelType: this.currentModel
        });
      });

      self.postMessage({
        type: 'REMOVAL_PROGRESS',
        progress: 20
      });

      // Preprocess image for the model
      const preprocessedInput = await this.preprocessImage(imageData);

      self.postMessage({
        type: 'REMOVAL_PROGRESS',
        progress: 30
      });

      // Execute segmentation model
      const mask = await this.executeSegmentation(preprocessedInput);

      self.postMessage({
        type: 'REMOVAL_PROGRESS',
        progress: 60
      });

      // Post-process mask
      const refinedMask = await this.postprocessMask(mask, imageData, edgeSmoothing, matting);

      self.postMessage({
        type: 'REMOVAL_PROGRESS',
        progress: 80
      });

      // Generate final output based on requested type
      const result = await this.generateOutput(imageData, refinedMask, outputType);

      self.postMessage({
        type: 'REMOVAL_COMPLETE',
        data: result,
        outputType
      });

    } catch (error) {
      console.error('Background removal failed:', error);
      self.postMessage({
        type: 'REMOVAL_ERROR',
        error: getErrorMessage(error)
      });
    }
  }

  private async preprocessImage(imageData: ImageData): Promise<any> {
    // Get model input size
    const inputSize = this.currentModel === 'u2net' ? 320 : 256;
    
    // Create canvas and resize
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    // Resize to model input size while maintaining aspect ratio
    const resizedCanvas = new OffscreenCanvas(inputSize, inputSize);
    const resizedCtx = resizedCanvas.getContext('2d')!;
    
    // Calculate scaling to maintain aspect ratio
    const scale = Math.min(inputSize / imageData.width, inputSize / imageData.height);
    const scaledWidth = imageData.width * scale;
    const scaledHeight = imageData.height * scale;
    const offsetX = (inputSize - scaledWidth) / 2;
    const offsetY = (inputSize - scaledHeight) / 2;

    // Fill with neutral background
    resizedCtx.fillStyle = '#808080';
    resizedCtx.fillRect(0, 0, inputSize, inputSize);
    
    // Draw scaled image
    resizedCtx.drawImage(canvas, offsetX, offsetY, scaledWidth, scaledHeight);

    return {
      tensor: await this.canvasToTensor(resizedCanvas),
      scale,
      offsetX,
      offsetY,
      originalWidth: imageData.width,
      originalHeight: imageData.height
    };
  }

  private async canvasToTensor(canvas: OffscreenCanvas): Promise<any> {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Convert to tensor format
    const tensorData = new Float32Array(canvas.width * canvas.height * 3);
    const { data } = imageData;

    // Normalize based on model requirements
    const normalize = this.currentModel === 'u2net' ? this.normalizeU2Net : this.normalizeRemBG;

    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];

      const normalized = normalize(r, g, b);

      tensorData[pixelIndex] = normalized.r;
      tensorData[pixelIndex + canvas.width * canvas.height] = normalized.g;
      tensorData[pixelIndex + 2 * canvas.width * canvas.height] = normalized.b;
    }

    return {
      data: tensorData,
      shape: [1, 3, canvas.height, canvas.width]
    };
  }

  private normalizeU2Net(r: number, g: number, b: number) {
    // U²-Net normalization (ImageNet stats)
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];
    
    return {
      r: (r / 255.0 - mean[0]) / std[0],
      g: (g / 255.0 - mean[1]) / std[1],
      b: (b / 255.0 - mean[2]) / std[2]
    };
  }

  private normalizeRemBG(r: number, g: number, b: number) {
    // RemBG normalization (simple 0-1 scaling)
    return {
      r: r / 255.0,
      g: g / 255.0,
      b: b / 255.0
    };
  }

  private async executeSegmentation(preprocessedInput: any): Promise<any> {
    const { tensor } = preprocessedInput;
    
    // Execute model through model manager
    const result = await this.modelManager.executeModel(this.currentModel, tensor);
    
    return {
      ...result,
      preprocessInfo: preprocessedInput
    };
  }

  private async postprocessMask(
    rawMask: any, 
    originalImage: ImageData, 
    edgeSmoothing: boolean, 
    matting: boolean
  ): Promise<ImageData> {
    const { preprocessInfo } = rawMask;
    let maskData: Float32Array;
    let maskWidth: number, maskHeight: number;

    if (rawMask.data) {
      maskData = rawMask.data;
      maskWidth = rawMask.shape[3] || rawMask.shape[2];
      maskHeight = rawMask.shape[2] || rawMask.shape[1];
    } else {
      maskData = rawMask;
      maskWidth = preprocessInfo.scale ? 
        Math.round(originalImage.width * preprocessInfo.scale) : originalImage.width;
      maskHeight = preprocessInfo.scale ? 
        Math.round(originalImage.height * preprocessInfo.scale) : originalImage.height;
    }

    // Convert mask to ImageData
    const maskCanvas = new OffscreenCanvas(maskWidth, maskHeight);
    const maskCtx = maskCanvas.getContext('2d')!;
    const maskImageData = maskCtx.createImageData(maskWidth, maskHeight);

    // Convert mask tensor to grayscale ImageData
    for (let i = 0; i < maskWidth * maskHeight; i++) {
      let maskValue = maskData[i];
      
      // Apply sigmoid if not already applied
      if (this.currentModel === 'u2net' && (maskValue < 0 || maskValue > 1)) {
        maskValue = 1 / (1 + Math.exp(-maskValue));
      }
      
      const gray = Math.round(maskValue * 255);
      maskImageData.data[i * 4] = gray;     // R
      maskImageData.data[i * 4 + 1] = gray; // G
      maskImageData.data[i * 4 + 2] = gray; // B
      maskImageData.data[i * 4 + 3] = 255;  // A
    }

    maskCtx.putImageData(maskImageData, 0, 0);

    // Resize back to original image size
    const finalMaskCanvas = new OffscreenCanvas(originalImage.width, originalImage.height);
    const finalMaskCtx = finalMaskCanvas.getContext('2d')!;

    if (preprocessInfo.scale) {
      // Account for padding and scaling
      const scaledWidth = originalImage.width * preprocessInfo.scale;
      const scaledHeight = originalImage.height * preprocessInfo.scale;
      
      finalMaskCtx.drawImage(
        maskCanvas,
        preprocessInfo.offsetX, preprocessInfo.offsetY,
        scaledWidth, scaledHeight,
        0, 0,
        originalImage.width, originalImage.height
      );
    } else {
      finalMaskCtx.drawImage(maskCanvas, 0, 0, originalImage.width, originalImage.height);
    }

    let finalMask = finalMaskCtx.getImageData(0, 0, originalImage.width, originalImage.height);

    // Apply edge smoothing
    if (edgeSmoothing) {
      finalMask = await this.applyEdgeSmoothing(finalMask);
    }

    // Apply alpha matting for better edges
    if (matting) {
      finalMask = await this.applyAlphaMatting(finalMask, originalImage);
    }

    return finalMask;
  }

  private async applyEdgeSmoothing(mask: ImageData): Promise<ImageData> {
    // Apply Gaussian blur to smooth edges
    const canvas = new OffscreenCanvas(mask.width, mask.height);
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(mask, 0, 0);

    // Apply blur filter
    ctx.filter = 'blur(1px)';
    ctx.drawImage(canvas, 0, 0);
    ctx.filter = 'none';

    return ctx.getImageData(0, 0, mask.width, mask.height);
  }

  private async applyAlphaMatting(mask: ImageData, originalImage: ImageData): Promise<ImageData> {
    // Simplified alpha matting - refine edges using original image colors
    const refinedMask = new ImageData(
      new Uint8ClampedArray(mask.data),
      mask.width,
      mask.height
    );

    const originalData = originalImage.data;
    const maskData = refinedMask.data;

    // Find edge pixels and refine them
    for (let y = 1; y < mask.height - 1; y++) {
      for (let x = 1; x < mask.width - 1; x++) {
        const index = (y * mask.width + x) * 4;
        const maskValue = maskData[index];

        // Check if this is an edge pixel (gradient in mask)
        const neighbors = [
          maskData[((y - 1) * mask.width + x) * 4],     // top
          maskData[((y + 1) * mask.width + x) * 4],     // bottom
          maskData[(y * mask.width + (x - 1)) * 4],     // left
          maskData[(y * mask.width + (x + 1)) * 4]      // right
        ];

        const gradient = Math.max(...neighbors) - Math.min(...neighbors);
        
        if (gradient > 50) { // Edge pixel
          // Refine based on color similarity to foreground/background
          const originalIndex = index;
          const r = originalData[originalIndex];
          const g = originalData[originalIndex + 1];
          const b = originalData[originalIndex + 2];

          // Simple refinement based on local color analysis
          const refinedAlpha = this.refineEdgeAlpha(r, g, b, maskValue, originalData, mask.width, mask.height, x, y);
          
          maskData[index] = refinedAlpha;
          maskData[index + 1] = refinedAlpha;
          maskData[index + 2] = refinedAlpha;
        }
      }
    }

    return refinedMask;
  }

  private refineEdgeAlpha(r: number, g: number, b: number, originalAlpha: number, 
                         imageData: Uint8ClampedArray, width: number, height: number, 
                         x: number, y: number): number {
    // Analyze local neighborhood to refine alpha
    let count = 0;

    const radius = 3;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIndex = (ny * width + nx) * 4;
          const nr = imageData[nIndex];
          const ng = imageData[nIndex + 1];
          const nb = imageData[nIndex + 2];
          
          const colorDist = Math.sqrt((r - nr) ** 2 + (g - ng) ** 2 + (b - nb) ** 2);
          
          if (colorDist < 50) { // Similar color
            // Determine if this neighbor is likely foreground or background
            // This is simplified - real matting would use trimap
            count++;
          }
        }
      }
    }

    // Return refined alpha (simplified)
    return Math.max(0, Math.min(255, originalAlpha));
  }

  private async generateOutput(
    originalImage: ImageData, 
    mask: ImageData, 
    outputType: string
  ): Promise<ImageData> {

    switch (outputType) {
      case 'mask':
        // Return the mask itself
        return mask;

      case 'cutout':
        // Return image with background removed (transparent)
        const cutoutImageData = new ImageData(
          new Uint8ClampedArray(originalImage.data),
          originalImage.width,
          originalImage.height
        );

        // Apply mask as alpha channel
        for (let i = 0; i < mask.data.length; i += 4) {
          const alpha = mask.data[i]; // Use red channel as alpha
          cutoutImageData.data[i + 3] = alpha; // Set alpha channel
        }

        return cutoutImageData;

      case 'background':
        // Return only the background (inverse mask)
        const backgroundImageData = new ImageData(
          new Uint8ClampedArray(originalImage.data),
          originalImage.width,
          originalImage.height
        );

        // Apply inverse mask
        for (let i = 0; i < mask.data.length; i += 4) {
          const alpha = 255 - mask.data[i]; // Inverse mask
          backgroundImageData.data[i + 3] = alpha;
        }

        return backgroundImageData;

      default:
        return originalImage;
    }
  }

  getStatus() {
    const gpuInfo = this.gpuDetector.getGPUInfo();
    const loadedModels = this.modelManager.getLoadedModels();
    
    return {
      initialized: this.initialized,
      currentModel: this.currentModel,
      backend: this.modelManager.getBackend(),
      gpuInfo,
      loadedModels,
      availableModels: Object.keys(MODEL_CONFIGS).filter(key => 
        MODEL_CONFIGS[key].type === 'background-removal'
      )
    };
  }
}

// Worker instance
const worker = new GPUBackgroundRemovalWorker();

// Message handler
self.onmessage = async (event: MessageEvent<BackgroundRemovalMessage>) => {
  const { type, modelType, imageData, options } = event.data;

  try {
    switch (type) {
      case 'INIT':
        await worker.initialize();
        break;

      case 'SWITCH_MODEL':
        if (modelType) {
          await worker.switchModel(modelType);
        }
        break;

      case 'REMOVE_BACKGROUND':
        if (imageData) {
          await worker.removeBackground(imageData, options);
        }
        break;

      case 'GET_STATUS':
        const status = worker.getStatus();
        self.postMessage({
          type: 'STATUS_RESPONSE',
          data: status
        });
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    console.error('Background removal worker error:', error);
    self.postMessage({
      type: 'ERROR',
      error: getErrorMessage(error)
    });
  }
}; 