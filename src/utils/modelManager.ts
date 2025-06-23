/**
 * Unified Model Manager
 * Handles loading and execution of multiple AI models with GPU acceleration
 */

import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgpu';
import '@tensorflow/tfjs-backend-webgl';
import { GPUDetector, GPUInfo } from './gpuDetection';

export interface ModelConfig {
  name: string;
  type: 'inpainting' | 'face-restoration' | 'background-removal' | 'segmentation';
  path: string;
  format: 'tfjs' | 'onnx' | 'wasm';
  size: number; // in MB
  requirements: {
    minGPUTier: 'high' | 'medium' | 'low';
    minMemory: number; // in MB
    backends: ('webgpu' | 'webgl' | 'cpu')[];
  };
}

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // Inpainting Models
  'lama': {
    name: 'LaMa (Large Mask Inpainting)',
    type: 'inpainting',
    path: '/models/lama/model.json',
    format: 'tfjs',
    size: 120,
    requirements: {
      minGPUTier: 'medium',
      minMemory: 512,
      backends: ['webgpu', 'webgl']
    }
  },
  'aot-gan': {
    name: 'AOT-GAN',
    type: 'inpainting',
    path: '/models/aot-gan/model.onnx',
    format: 'onnx',
    size: 180,
    requirements: {
      minGPUTier: 'medium',
      minMemory: 1024,
      backends: ['webgpu', 'webgl', 'cpu']
    }
  },
  
  // Face Restoration
  'gfpgan': {
    name: 'GFPGAN',
    type: 'face-restoration',
    path: '/models/gfpgan/model.json',
    format: 'tfjs',
    size: 340,
    requirements: {
      minGPUTier: 'high',
      minMemory: 2048,
      backends: ['webgpu', 'webgl']
    }
  },
  
  // Background Removal
  'u2net': {
    name: 'U²-Net',
    type: 'background-removal',
    path: '/models/u2net/model.json',
    format: 'tfjs',
    size: 43,
    requirements: {
      minGPUTier: 'low',
      minMemory: 256,
      backends: ['webgpu', 'webgl', 'cpu']
    }
  },
  'rembg': {
    name: 'RemBG',
    type: 'background-removal',
    path: '/models/rembg/model.json',
    format: 'tfjs',
    size: 15,
    requirements: {
      minGPUTier: 'low',
      minMemory: 128,
      backends: ['webgpu', 'webgl', 'cpu']
    }
  },
  
  // Segmentation
  'tinysam': {
    name: 'TinySAM',
    type: 'segmentation',
    path: '/models/tinysam/model.json',
    format: 'tfjs',
    size: 25,
    requirements: {
      minGPUTier: 'low',
      minMemory: 256,
      backends: ['webgpu', 'webgl', 'cpu']
    }
  }
};

export class ModelManager {
  private static instance: ModelManager;
  private gpuDetector: GPUDetector;
  private loadedModels: Map<string, any> = new Map();
  private backend: 'webgpu' | 'webgl' | 'cpu' = 'cpu';
  private initialized = false;

  private constructor() {
    this.gpuDetector = GPUDetector.getInstance();
  }

  static getInstance(): ModelManager {
    if (!ModelManager.instance) {
      ModelManager.instance = new ModelManager();
    }
    return ModelManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // Detect GPU and set up backend
    const gpuInfo = await this.gpuDetector.detectGPU();
    this.backend = gpuInfo.backend;

    // Configure TensorFlow.js
    await this.configureTensorFlow(gpuInfo);
    
    this.initialized = true;
    console.log(`✅ Model Manager initialized with ${this.backend} backend`);
  }

  private async configureTensorFlow(gpuInfo: GPUInfo): Promise<void> {
    // Set backend based on GPU capabilities
    if (gpuInfo.features.webgpu && gpuInfo.isDiscrete) {
      try {
        await tf.setBackend('webgpu');
        console.log('🚀 Using WebGPU backend for TensorFlow.js');
        
        // Configure WebGPU options for better performance
        tf.env().set('WEBGPU_CONV_ALGORITHM', 'fft');
        tf.env().set('WEBGPU_MATMUL_ALGORITHM', 'webgpu');
        
        // Enable fp16 if supported
        if (gpuInfo.features.fp16) {
          tf.env().set('WEBGPU_USE_HALF_PRECISION', true);
          console.log('✅ FP16 enabled for faster computation');
        }
      } catch (e) {
        console.warn('WebGPU initialization failed, falling back to WebGL', e);
        await this.fallbackToWebGL();
      }
    } else if (gpuInfo.features.webgl2 || gpuInfo.features.webgl) {
      await this.fallbackToWebGL();
    } else {
      await tf.setBackend('cpu');
      console.log('⚠️ Using CPU backend - performance will be limited');
    }

    // Set memory growth to prevent OOM errors
    tf.env().set('WEBGL_DELETE_TEXTURE_THRESHOLD', 0);
    tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
    
    // Enable SIMD if available
    if (gpuInfo.features.simd) {
      tf.env().set('WASM_HAS_SIMD_SUPPORT', true);
      console.log('✅ SIMD enabled for CPU operations');
    }
  }

  private async fallbackToWebGL(): Promise<void> {
    await tf.setBackend('webgl');
    console.log('🎮 Using WebGL backend for TensorFlow.js');
    
    // Optimize WebGL settings
    tf.env().set('WEBGL_VERSION', 2);
    tf.env().set('WEBGL_CPU_FORWARD', false);
    tf.env().set('WEBGL_PACK', true);
    tf.env().set('WEBGL_FORCE_F16_TEXTURES', true);
    tf.env().set('WEBGL_RENDER_FLOAT32_CAPABLE', true);
    tf.env().set('WEBGL_FLUSH_THRESHOLD', -1);
  }

  async loadModel(modelKey: string, progressCallback?: (progress: number) => void): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    // Check if model is already loaded
    if (this.loadedModels.has(modelKey)) {
      console.log(`✅ Model ${modelKey} already loaded`);
      return this.loadedModels.get(modelKey);
    }

    const config = MODEL_CONFIGS[modelKey];
    if (!config) {
      throw new Error(`Model ${modelKey} not found`);
    }

    // Check if system meets requirements
    const gpuInfo = this.gpuDetector.getGPUInfo();
    if (!this.checkModelRequirements(config, gpuInfo)) {
      throw new Error(`System does not meet requirements for ${config.name}`);
    }

    console.log(`📥 Loading ${config.name}...`);
    progressCallback?.(10);

    try {
      let model;
      
      switch (config.format) {
        case 'tfjs':
          model = await this.loadTFJSModel(config.path, progressCallback);
          break;
        case 'onnx':
          model = await this.loadONNXModel(config.path, progressCallback);
          break;
        case 'wasm':
          model = await this.loadWASMModel(config.path, progressCallback);
          break;
        default:
          throw new Error(`Unsupported model format: ${config.format}`);
      }

      this.loadedModels.set(modelKey, model);
      progressCallback?.(100);
      console.log(`✅ ${config.name} loaded successfully`);
      
      return model;
    } catch (error) {
      console.error(`Failed to load ${config.name}:`, error);
      throw error;
    }
  }

  private checkModelRequirements(config: ModelConfig, gpuInfo: GPUInfo | null): boolean {
    if (!gpuInfo) return false;
    
    // Check GPU tier
    const tierValue: Record<string, number> = { high: 3, medium: 2, low: 1 };
    const gpuTierValue = tierValue[gpuInfo.tier];
    const requiredTierValue = tierValue[config.requirements.minGPUTier];
    
    if (gpuTierValue < requiredTierValue) {
      console.warn(`GPU tier ${gpuInfo.tier} is below minimum ${config.requirements.minGPUTier}`);
      return false;
    }

    // Check backend support
    if (!config.requirements.backends.includes(this.backend)) {
      console.warn(`Backend ${this.backend} not supported for this model`);
      return false;
    }

    return true;
  }

  private async loadTFJSModel(path: string, progressCallback?: (progress: number) => void): Promise<tf.GraphModel> {
    const model = await tf.loadGraphModel(path, {
      onProgress: (fraction: number) => {
        progressCallback?.(10 + fraction * 80);
      },
      weightUrlConverter: (url: string) => {
        // Convert to use CDN if needed
        if (url.startsWith('/models/')) {
          return `https://cdn.jsdelivr.net/gh/anemoia/models@latest${url}`;
        }
        return url;
      }
    });

    // Warm up the model
    progressCallback?.(90);
    await this.warmupModel(model);
    
    return model;
  }

  private async loadONNXModel(path: string, progressCallback?: (progress: number) => void): Promise<any> {
    // Dynamic import for ONNX Runtime
    const ort = await import('onnxruntime-web');
    
    // Configure execution providers based on backend
    const executionProviders = this.backend === 'webgpu' 
      ? ['webgpu', 'wasm']
      : this.backend === 'webgl'
      ? ['webgl', 'wasm']
      : ['wasm'];

    progressCallback?.(30);

    const session = await ort.InferenceSession.create(path, {
      executionProviders,
      graphOptimizationLevel: 'all',
      enableCpuMemArena: true,
      enableMemPattern: true,
      executionMode: 'parallel',
      interOpNumThreads: 0,
      intraOpNumThreads: 0,
      logSeverityLevel: 3
    });

    progressCallback?.(90);
    return session;
  }

  private async loadWASMModel(_path: string, _progressCallback?: (progress: number) => void): Promise<any> {
    // Implementation for WASM models
    throw new Error('WASM model loading not yet implemented');
  }

  private async warmupModel(_model: tf.GraphModel): Promise<void> {
    // Create dummy input to warm up the model
    // const dummyInput = tf.zeros([1, 224, 224, 3]);
    // const prediction = await model.predict(dummyInput) as tf.Tensor;
    
    // Clean up
    // dummyInput.dispose();
    // if (prediction && typeof prediction.dispose === 'function') {
    //   prediction.dispose();
    // }
    
    console.log('Model warmed up (placeholder)');
  }

  async executeModel(modelKey: string, input: tf.Tensor | ImageData, options: any = {}): Promise<tf.Tensor> {
    const model = await this.loadModel(modelKey);
    const config = MODEL_CONFIGS[modelKey];

    // Convert input if needed
    let tensorInput: tf.Tensor;
    if (input instanceof ImageData) {
      tensorInput = tf.browser.fromPixels(input);
    } else {
      tensorInput = input;
    }

    try {
      // Execute based on model type
      switch (config.type) {
        case 'inpainting':
          return await this.executeInpainting(model, tensorInput);
        case 'face-restoration':
          return await this.executeFaceRestoration(model, tensorInput);
        case 'background-removal':
          return await this.executeBackgroundRemoval(model, tensorInput);
        case 'segmentation':
          return await this.executeSegmentation(model, tensorInput, options);
        default:
          throw new Error(`Unknown model type: ${config.type}`);
      }
    } finally {
      // Clean up input tensor if we created it
      if (input instanceof ImageData) {
        tensorInput.dispose();
      }
    }
  }

  private async executeInpainting(model: any, input: tf.Tensor): Promise<tf.Tensor> {
    // Implementation specific to inpainting models
    const normalized = tf.div(input, 255.0);
    const batched = normalized.expandDims(0);
    
    const output = model.predict(batched) as tf.Tensor;
    
    // Clean up intermediates
    normalized.dispose();
    batched.dispose();
    
    return output.squeeze().mul(255);
  }

  private async executeFaceRestoration(model: any, input: tf.Tensor): Promise<tf.Tensor> {
    // Implementation specific to face restoration
    const preprocessed = tf.image.resizeBilinear(input, [512, 512]);
    const normalized = tf.div(preprocessed, 255.0);
    const batched = normalized.expandDims(0);
    
    const output = model.predict(batched) as tf.Tensor;
    
    // Clean up
    preprocessed.dispose();
    normalized.dispose();
    batched.dispose();
    
    return output.squeeze().mul(255);
  }

  private async executeBackgroundRemoval(model: any, input: tf.Tensor): Promise<tf.Tensor> {
    // Preprocess for U²-Net
    const resized = tf.image.resizeBilinear(input, [320, 320]);
    const normalized = tf.div(resized, 255.0);
    const batched = normalized.expandDims(0);
    
    const output = model.predict(batched) as tf.Tensor;
    
    // Post-process to get mask
    // const mask = tf.sigmoid(output).squeeze();
    const mask = output.squeeze(); // Temporary fix - remove sigmoid
    const resizedMask = tf.image.resizeBilinear(mask.expandDims(-1), [input.shape[0], input.shape[1]]);
    
    // Clean up
    resized.dispose();
    normalized.dispose();
    batched.dispose();
    output.dispose();
    mask.dispose();
    
    return resizedMask.squeeze();
  }

  private async executeSegmentation(model: any, input: tf.Tensor, options: any): Promise<tf.Tensor> {
    // TinySAM implementation
    const targetSize: [number, number] = [1024, 1024];
    const resized = tf.image.resizeBilinear(input, targetSize);
    const normalized = tf.div(resized, 255.0);
    const batched = normalized.expandDims(0);
    
    // Add point prompts if provided
    if (options.points) {
      console.log('Point prompts provided:', options.points);
    }
    
    const output = model.predict(batched) as tf.Tensor;
    
    // Clean up
    resized.dispose();
    normalized.dispose();
    batched.dispose();
    
    return output.squeeze();
  }

  getLoadedModels(): string[] {
    return Array.from(this.loadedModels.keys());
  }

  isModelLoaded(modelKey: string): boolean {
    return this.loadedModels.has(modelKey);
  }

  async unloadModel(modelKey: string): Promise<void> {
    if (this.loadedModels.has(modelKey)) {
      const model = this.loadedModels.get(modelKey);
      
      // Dispose TensorFlow.js models
      if (model && typeof model.dispose === 'function') {
        model.dispose();
      }
      
      this.loadedModels.delete(modelKey);
      console.log(`🗑️ Unloaded model: ${modelKey}`);
    }
  }

  async dispose(): Promise<void> {
    // Unload all models
    for (const modelKey of this.loadedModels.keys()) {
      await this.unloadModel(modelKey);
    }
    
    // Dispose TensorFlow.js backend
    // if (tf.disposeVariables) {
    //   await tf.disposeVariables();
    // }
    
    console.log('🗑️ Model Manager disposed');
  }

  getBackend(): string {
    return this.backend;
  }

  getGPUInfo(): GPUInfo | null {
    return this.gpuDetector.getGPUInfo();
  }
} 