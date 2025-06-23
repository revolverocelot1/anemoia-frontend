/**
 * GPU-Accelerated Multi-Model Inpainting Worker
 * Supports LaMa, AOT-GAN, and other inpainting models with WebGPU/WebGL acceleration
 */

import { ModelManager, MODEL_CONFIGS } from '../utils/modelManager';
import { GPUDetector } from '../utils/gpuDetection';
import { getErrorMessage } from '../utils/errorHandler';

interface InpaintingMessage {
  type: 'INIT' | 'INPAINT' | 'SWITCH_MODEL' | 'GET_STATUS';
  data?: any;
  modelType?: 'lama' | 'aot-gan';
  imageData?: ImageData;
  maskData?: ImageData;
}

class GPUInpaintingWorker {
  private modelManager: ModelManager;
  private gpuDetector: GPUDetector;
  private currentModel: 'lama' | 'aot-gan' = 'lama'; // Default to faster LaMa
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

      // Determine best default model based on GPU capability
      if (gpuInfo.tier === 'high' && gpuInfo.isDiscrete) {
        this.currentModel = 'aot-gan'; // Higher quality for powerful GPUs
      } else {
        this.currentModel = 'lama'; // Faster for lower-end hardware
      }

      this.initialized = true;

      self.postMessage({
        type: 'INIT_COMPLETE',
        data: {
          gpuInfo,
          backend: this.modelManager.getBackend(),
          defaultModel: this.currentModel,
          availableModels: ['lama', 'aot-gan']
        }
      });

      console.log(`🎨 Inpainting Worker initialized with ${this.currentModel} model`);
    } catch (error) {
      console.error('Failed to initialize inpainting worker:', error);
      self.postMessage({
        type: 'INIT_ERROR',
        error: getErrorMessage(error)
      });
    }
  }

  async switchModel(modelType: 'lama' | 'aot-gan') {
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

  async performInpainting(imageData: ImageData, maskData: ImageData) {
    if (!this.initialized) {
      throw new Error('Worker not initialized');
    }

    try {
      self.postMessage({
        type: 'INPAINTING_STARTED',
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

      // Preprocess inputs
      const processedInputs = await this.preprocessInputs(imageData, maskData);

      self.postMessage({
        type: 'INPAINTING_PROGRESS',
        progress: 30
      });

      // Execute model
      const result = await this.executeInpainting(processedInputs);

      self.postMessage({
        type: 'INPAINTING_PROGRESS',
        progress: 80
      });

      // Post-process output
      const outputImageData = await this.postprocessOutput(result, imageData.width, imageData.height);

      self.postMessage({
        type: 'INPAINTING_COMPLETE',
        data: outputImageData
      });

    } catch (error) {
      console.error('Inpainting failed:', error);
      self.postMessage({
        type: 'INPAINTING_ERROR',
        error: getErrorMessage(error)
      });
    }
  }

  private async preprocessInputs(imageData: ImageData, maskData: ImageData) {
    // Convert ImageData to tensors
    const imageTensor = await this.imageDataToTensor(imageData);
    const maskTensor = await this.maskDataToTensor(maskData);

    return { imageTensor, maskTensor };
  }

  private async imageDataToTensor(imageData: ImageData): Promise<any> {
    // Create canvas and context for processing
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d')!;
    
    // Put image data on canvas
    ctx.putImageData(imageData, 0, 0);
    
    // Convert to tensor depending on model requirements
    if (this.currentModel === 'lama') {
      // LaMa expects 512x512 input
      const resizedCanvas = new OffscreenCanvas(512, 512);
      const resizedCtx = resizedCanvas.getContext('2d')!;
      resizedCtx.drawImage(canvas, 0, 0, 512, 512);
      
      return this.canvasToTensor(resizedCanvas);
    } else {
      // AOT-GAN expects 512x512 input
      const resizedCanvas = new OffscreenCanvas(512, 512);
      const resizedCtx = resizedCanvas.getContext('2d')!;
      resizedCtx.drawImage(canvas, 0, 0, 512, 512);
      
      return this.canvasToTensor(resizedCanvas);
    }
  }

  private async maskDataToTensor(maskData: ImageData): Promise<any> {
    // Process mask data to binary mask
    const canvas = new OffscreenCanvas(maskData.width, maskData.height);
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(maskData, 0, 0);

    // Create binary mask from red brush strokes
    const processedImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = processedImageData.data;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];

      // Detect red brush strokes
      const isRedMask = r > 150 && g < 100 && b < 100 && a > 100;
      
      if (isRedMask) {
        data[i] = 255;     // R
        data[i + 1] = 255; // G  
        data[i + 2] = 255; // B
        data[i + 3] = 255; // A
      } else {
        data[i] = 0;       // R
        data[i + 1] = 0;   // G
        data[i + 2] = 0;   // B
        data[i + 3] = 255; // A
      }
    }

    ctx.putImageData(processedImageData, 0, 0);

    // Resize to model input size
    const targetSize = this.currentModel === 'lama' ? 512 : 512;
    const resizedCanvas = new OffscreenCanvas(targetSize, targetSize);
    const resizedCtx = resizedCanvas.getContext('2d')!;
    resizedCtx.drawImage(canvas, 0, 0, targetSize, targetSize);

    return this.canvasToMaskTensor(resizedCanvas);
  }

  private async canvasToTensor(canvas: OffscreenCanvas): Promise<any> {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Convert to Float32Array in the format expected by the model
    const tensorData = new Float32Array(canvas.width * canvas.height * 3);
    const { data } = imageData;

    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      
      // Normalize to [0, 1] for LaMa, [-1, 1] for AOT-GAN
      const normalize = this.currentModel === 'aot-gan';
      
      const r = data[i] / 255.0;
      const g = data[i + 1] / 255.0;
      const b = data[i + 2] / 255.0;

      if (normalize) {
        tensorData[pixelIndex] = r * 2 - 1;
        tensorData[pixelIndex + canvas.width * canvas.height] = g * 2 - 1;
        tensorData[pixelIndex + 2 * canvas.width * canvas.height] = b * 2 - 1;
      } else {
        tensorData[pixelIndex] = r;
        tensorData[pixelIndex + canvas.width * canvas.height] = g;
        tensorData[pixelIndex + 2 * canvas.width * canvas.height] = b;
      }
    }

    return {
      data: tensorData,
      shape: [1, 3, canvas.height, canvas.width]
    };
  }

  private async canvasToMaskTensor(canvas: OffscreenCanvas): Promise<any> {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const tensorData = new Float32Array(canvas.width * canvas.height);
    const { data } = imageData;

    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      const grayscale = data[i] / 255.0; // Use red channel as mask
      tensorData[pixelIndex] = grayscale;
    }

    return {
      data: tensorData,
      shape: [1, 1, canvas.height, canvas.width]
    };
  }

  private async executeInpainting(inputs: any): Promise<any> {
    const config = MODEL_CONFIGS[this.currentModel];
    
    if (config.format === 'tfjs') {
      return await this.executeTFJSInpainting(inputs);
    } else if (config.format === 'onnx') {
      return await this.executeONNXInpainting(inputs);
    } else {
      throw new Error(`Unsupported model format: ${config.format}`);
    }
  }

  private async executeTFJSInpainting(inputs: any): Promise<any> {
    // Use TensorFlow.js execution through model manager
    const { imageTensor, maskTensor } = inputs;
    
    // Create combined input (image + mask)
    const combinedInput = this.combineImageAndMask(imageTensor, maskTensor);
    
    // Execute model
    const result = await this.modelManager.executeModel(this.currentModel, combinedInput);
    
    return result;
  }

  private async executeONNXInpainting(inputs: any): Promise<any> {
    // Get ONNX session from model manager
    const session = await this.modelManager.loadModel(this.currentModel);
    const { imageTensor, maskTensor } = inputs;

    // Create ONNX tensors
    const ort = await import('onnxruntime-web');
    
    const imageTensorONNX = new ort.Tensor('float32', imageTensor.data, imageTensor.shape);
    const maskTensorONNX = new ort.Tensor('float32', maskTensor.data, maskTensor.shape);

    // Run inference
    const feeds = {
      'image': imageTensorONNX,
      'mask': maskTensorONNX
    };

    const results = await session.run(feeds);
    const outputTensor = results['output'] || results['inpainted_image'];

    // Clean up
    imageTensorONNX.dispose();
    maskTensorONNX.dispose();

    return outputTensor;
  }

  private combineImageAndMask(imageTensor: any, maskTensor: any): any {
    // For models that expect 4-channel input (RGB + mask)
    const combined = new Float32Array(imageTensor.data.length + maskTensor.data.length);
    
    // Copy image channels
    combined.set(imageTensor.data);
    
    // Add mask channel
    combined.set(maskTensor.data, imageTensor.data.length);
    
    return {
      data: combined,
      shape: [1, 4, imageTensor.shape[2], imageTensor.shape[3]]
    };
  }

  private async postprocessOutput(result: any, originalWidth: number, originalHeight: number): Promise<ImageData> {
    let outputData: Float32Array;
    let width: number, height: number;

    if (result.data) {
      // TensorFlow.js tensor
      outputData = result.data;
      width = result.shape[3] || result.shape[2];
      height = result.shape[2] || result.shape[1];
    } else {
      // ONNX tensor
      outputData = result.data;
      const dims = result.dims;
      width = dims[3] || dims[2];
      height = dims[2] || dims[1];
    }

    // Convert to ImageData
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);

    // Convert tensor data to RGBA
    for (let i = 0; i < width * height; i++) {
      let r, g, b;
      
      if (this.currentModel === 'aot-gan') {
        // AOT-GAN outputs in [-1, 1] range
        r = Math.round((outputData[i] + 1) * 127.5);
        g = Math.round((outputData[i + width * height] + 1) * 127.5);
        b = Math.round((outputData[i + 2 * width * height] + 1) * 127.5);
      } else {
        // LaMa outputs in [0, 1] range
        r = Math.round(outputData[i] * 255);
        g = Math.round(outputData[i + width * height] * 255);
        b = Math.round(outputData[i + 2 * width * height] * 255);
      }

      imageData.data[i * 4] = Math.max(0, Math.min(255, r));
      imageData.data[i * 4 + 1] = Math.max(0, Math.min(255, g));
      imageData.data[i * 4 + 2] = Math.max(0, Math.min(255, b));
      imageData.data[i * 4 + 3] = 255;
    }

    // Resize back to original dimensions if needed
    if (width !== originalWidth || height !== originalHeight) {
      ctx.putImageData(imageData, 0, 0);
      
      const finalCanvas = new OffscreenCanvas(originalWidth, originalHeight);
      const finalCtx = finalCanvas.getContext('2d')!;
      finalCtx.drawImage(canvas, 0, 0, originalWidth, originalHeight);
      
      return finalCtx.getImageData(0, 0, originalWidth, originalHeight);
    }

    return imageData;
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
        MODEL_CONFIGS[key].type === 'inpainting'
      )
    };
  }
}

// Worker instance
const worker = new GPUInpaintingWorker();

// Message handler
self.onmessage = async (event: MessageEvent<InpaintingMessage>) => {
  const { type, modelType, imageData, maskData } = event.data;

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

      case 'INPAINT':
        if (imageData && maskData) {
          await worker.performInpainting(imageData, maskData);
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
    console.error('Worker error:', error);
    self.postMessage({
      type: 'ERROR',
      error: getErrorMessage(error)
    });
  }
}; 