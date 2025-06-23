/**
 * PROFESSIONAL OBJECT REMOVAL SYSTEM
 * Based on lxfater/inpaint-web and MI-GAN research
 * Features: Real ONNX neural networks, WebGPU acceleration, multiple models
 */

import * as ort from 'onnxruntime-web';

interface InpaintingRequest {
  imageData: ImageData;
  maskData: ImageData;
  modelType: 'auto' | 'mi-gan-mobile' | 'aot-gan';
  quality: 'fast' | 'balanced' | 'high';
}

interface InpaintingResponse {
  success: boolean;
  resultImageData?: ImageData;
  error?: string;
  performanceStats?: {
    preprocessTime: number;
    inferenceTime: number;
    postprocessTime: number;
    totalTime: number;
    modelUsed: string;
    acceleration: string;
    gpuType: string;
  };
  warnings?: string[];
}

interface GPUInfo {
  type: 'nvidia-dedicated' | 'amd-dedicated' | 'other-dedicated' | 'intel-integrated' | 'other-integrated' | 'unknown';
  performance: 'high' | 'medium' | 'low';
  webgpuSupported: boolean;
  vendor?: string;
  device?: string;
}

interface ModelConfig {
  name: string;
  displayName: string;
  description: string;
  modelUrl: string;
  inputSize: number;
  preferredGPU: string[];
  memoryMB: number;
}

class ObjectRemovalProcessor {
  private session: ort.InferenceSession | null = null;
  private currentModel: string = '';
  private gpuInfo: GPUInfo | null = null;
  private isInitialized = false;

  private readonly models: Record<string, ModelConfig> = {
    'mi-gan-mobile': {
      name: 'mi-gan-mobile',
      displayName: 'MI-GAN Mobile',
      description: 'Fast object removal optimized for mobile devices',
      modelUrl: '/models/mi-gan-mobile.onnx',
      inputSize: 512,
      preferredGPU: ['intel-integrated', 'other-integrated'],
      memoryMB: 50
    },
    'aot-gan': {
      name: 'aot-gan',
      displayName: 'AOT-GAN High Quality',
      description: 'High-quality object removal using aggregated contextual transformations',
      modelUrl: '/models/aot-gan.onnx',
      inputSize: 512,
      preferredGPU: ['nvidia-dedicated', 'amd-dedicated', 'other-dedicated'],
      memoryMB: 200
    },
    'lama-big': {
      name: 'lama-big',
      displayName: 'LaMa High Quality',
      description: 'High-quality object removal using Large Mask Inpainting',
      modelUrl: '/models/lama-big.onnx',
      inputSize: 512,
      preferredGPU: ['nvidia-dedicated', 'amd-dedicated', 'other-dedicated'],
      memoryMB: 200
    }
  };

  constructor() {
    this.initializeORT();
  }

  async initializeORT(): Promise<void> {
    try {
      // Configure ONNX Runtime for production environment with working CDN
      ort.env.wasm.wasmPaths = '/';
      ort.env.wasm.numThreads = Math.min(navigator.hardwareConcurrency || 4, 4);
      ort.env.logLevel = 'warning';

      await this.detectGPU();
      this.isInitialized = true;
      console.log('ONNX Runtime initialized successfully');
    } catch (error) {
      console.error('Failed to initialize ONNX Runtime:', error);
      this.isInitialized = true; // Still mark as initialized to allow fallback
    }
  }

  private async detectGPU(): Promise<GPUInfo> {
    let gpu: GPUInfo = {
      type: 'unknown',
      performance: 'low',
      webgpuSupported: false
    };

    try {
      // Check WebGPU support first
      if ('gpu' in navigator) {
        try {
          const adapter = await (navigator as any).gpu.requestAdapter({
            powerPreference: 'high-performance'
          });
          
          if (adapter) {
            gpu.webgpuSupported = true;
            
            // Try to get adapter info
            try {
              let info: any = null;
              if (adapter.requestAdapterInfo) {
                info = await adapter.requestAdapterInfo();
              } else if (adapter.info) {
                info = adapter.info;
              }
              
              if (info) {
                gpu.vendor = info.vendor;
                gpu.device = info.description || info.device;
                
                const vendor = (info.vendor || '').toLowerCase();
                const device = (info.description || info.device || '').toLowerCase();
                
                // Classify GPU type
                if (vendor.includes('nvidia') || device.includes('nvidia')) {
                  gpu.type = 'nvidia-dedicated';
                  gpu.performance = 'high';
                } else if (vendor.includes('amd') || device.includes('amd') || device.includes('radeon')) {
                  gpu.type = 'amd-dedicated';
                  gpu.performance = device.includes('rx') || device.includes('vega') ? 'high' : 'medium';
                } else if (vendor.includes('intel') || device.includes('intel')) {
                  gpu.type = device.includes('arc') ? 'other-dedicated' : 'intel-integrated';
                  gpu.performance = device.includes('arc') ? 'medium' : 'low';
                } else {
                  gpu.type = 'other-dedicated';
                  gpu.performance = 'medium';
                }
              }
            } catch (e) {
              console.warn('Could not get detailed adapter info:', e);
            }
          }
        } catch (e) {
          console.warn('WebGPU adapter request failed:', e);
        }
      }

      // Fallback to WebGL detection if WebGPU failed
      if (!gpu.webgpuSupported || gpu.type === 'unknown') {
        try {
          const canvas = new OffscreenCanvas(1, 1);
          const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
          
          if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
              const vendor = (gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || '').toLowerCase();
              const renderer = (gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || '').toLowerCase();
              
              gpu.vendor = vendor;
              gpu.device = renderer;
              
              if (vendor.includes('nvidia') || renderer.includes('nvidia')) {
                gpu.type = 'nvidia-dedicated';
                gpu.performance = 'high';
              } else if (vendor.includes('amd') || renderer.includes('amd')) {
                gpu.type = 'amd-dedicated';
                gpu.performance = 'medium';
              } else if (vendor.includes('intel') || renderer.includes('intel')) {
                gpu.type = 'intel-integrated';
                gpu.performance = 'low';
              }
            }
          }
        } catch (e) {
          console.warn('WebGL detection failed:', e);
        }
      }

    } catch (error) {
      console.warn('GPU detection failed:', error);
    }

    this.gpuInfo = gpu;
    return gpu;
  }

  private selectOptimalModel(requestedModel: string): string {
    if (requestedModel !== 'auto') {
      return requestedModel;
    }

    if (!this.gpuInfo) {
      return 'mi-gan-mobile';
    }

    // Auto-select based on GPU performance
    if (this.gpuInfo.performance === 'high' && this.gpuInfo.webgpuSupported) {
      return 'aot-gan';
    } else if (this.gpuInfo.performance === 'medium') {
      return 'mi-gan-mobile';
    } else {
      return 'mi-gan-mobile';
    }
  }

  private async loadModel(modelName: string): Promise<ort.InferenceSession> {
    const model = this.models[modelName];
    if (!model) {
      throw new Error(`Unknown model: ${modelName}`);
    }

    // Determine execution providers
    const executionProviders: string[] = [];

    if (this.gpuInfo?.webgpuSupported) {
      executionProviders.push('webgpu');
    }
    
    executionProviders.push('webgl');
    executionProviders.push('wasm');

    const sessionOptions: ort.InferenceSession.SessionOptions = {
      executionProviders,
      graphOptimizationLevel: 'all',
      enableCpuMemArena: true,
      enableMemPattern: true,
      executionMode: 'parallel'
    };

    try {
      console.log(`Loading model: ${model.displayName} from ${model.modelUrl}`);
      const session = await ort.InferenceSession.create(model.modelUrl, sessionOptions);
      console.log(`Model loaded successfully with providers:`, executionProviders);
      return session;
    } catch (error) {
      console.error(`Failed to load model ${modelName}:`, error);
      throw error;
    }
  }

  private preprocessInputs(imageData: ImageData, maskData: ImageData): {
    imageTensor: ort.Tensor;
    maskTensor: ort.Tensor;
    originalSize: { width: number; height: number };
  } {
    const { width, height } = imageData;
    const targetSize = 512;

    // Create canvases for preprocessing
    const imageCanvas = new OffscreenCanvas(targetSize, targetSize);
    const imageCtx = imageCanvas.getContext('2d')!;
    
    const maskCanvas = new OffscreenCanvas(targetSize, targetSize);
    const maskCtx = maskCanvas.getContext('2d')!;

    // Resize image
    const tempImageCanvas = new OffscreenCanvas(width, height);
    const tempImageCtx = tempImageCanvas.getContext('2d')!;
    tempImageCtx.putImageData(imageData, 0, 0);
    imageCtx.drawImage(tempImageCanvas, 0, 0, targetSize, targetSize);

    // Resize mask
    const tempMaskCanvas = new OffscreenCanvas(width, height);
    const tempMaskCtx = tempMaskCanvas.getContext('2d')!;
    tempMaskCtx.putImageData(maskData, 0, 0);
    maskCtx.drawImage(tempMaskCanvas, 0, 0, targetSize, targetSize);

    // Get processed image data
    const processedImageData = imageCtx.getImageData(0, 0, targetSize, targetSize);
    const processedMaskData = maskCtx.getImageData(0, 0, targetSize, targetSize);

    // Convert to tensors (NCHW format)
    const imageArray = new Float32Array(3 * targetSize * targetSize);
    const maskArray = new Float32Array(1 * targetSize * targetSize);

    for (let i = 0; i < targetSize * targetSize; i++) {
      const pixelIndex = i * 4;
      
      // Normalize image to [-1, 1]
      imageArray[i] = (processedImageData.data[pixelIndex] / 255.0) * 2.0 - 1.0; // R
      imageArray[i + targetSize * targetSize] = (processedImageData.data[pixelIndex + 1] / 255.0) * 2.0 - 1.0; // G
      imageArray[i + 2 * targetSize * targetSize] = (processedImageData.data[pixelIndex + 2] / 255.0) * 2.0 - 1.0; // B
      
      // Binary mask (1 for areas to inpaint, 0 for keep)
      maskArray[i] = processedMaskData.data[pixelIndex] > 128 ? 1.0 : 0.0;
    }

    return {
      imageTensor: new ort.Tensor('float32', imageArray, [1, 3, targetSize, targetSize]),
      maskTensor: new ort.Tensor('float32', maskArray, [1, 1, targetSize, targetSize]),
      originalSize: { width, height }
    };
  }

  private postprocessOutput(
    output: ort.Tensor,
    originalSize: { width: number; height: number }
  ): ImageData {
    const targetSize = 512;
    const outputData = output.data as Float32Array;

    // Create canvas for postprocessing
    const canvas = new OffscreenCanvas(targetSize, targetSize);
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(targetSize, targetSize);

    // Convert tensor back to image data
    for (let i = 0; i < targetSize * targetSize; i++) {
      const pixelIndex = i * 4;
      
      // Denormalize from [-1, 1] to [0, 255]
      imageData.data[pixelIndex] = Math.max(0, Math.min(255, (outputData[i] + 1.0) * 127.5)); // R
      imageData.data[pixelIndex + 1] = Math.max(0, Math.min(255, (outputData[i + targetSize * targetSize] + 1.0) * 127.5)); // G
      imageData.data[pixelIndex + 2] = Math.max(0, Math.min(255, (outputData[i + 2 * targetSize * targetSize] + 1.0) * 127.5)); // B
      imageData.data[pixelIndex + 3] = 255; // A
    }

    // Resize back to original dimensions if needed
    if (originalSize.width !== targetSize || originalSize.height !== targetSize) {
      ctx.putImageData(imageData, 0, 0);
      
      const finalCanvas = new OffscreenCanvas(originalSize.width, originalSize.height);
      const finalCtx = finalCanvas.getContext('2d')!;
      finalCtx.drawImage(canvas, 0, 0, originalSize.width, originalSize.height);
      
      return finalCtx.getImageData(0, 0, originalSize.width, originalSize.height);
    }

    return imageData;
  }

  private advancedFallbackInpainting(imageData: ImageData, maskData: ImageData): ImageData {
    // Validate inputs
    if (!imageData || !maskData || !imageData.width || !imageData.height) {
      throw new Error('Invalid image data provided to fallback inpainting');
    }

    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    
    const result = ctx.getImageData(0, 0, imageData.width, imageData.height);
    const data = result.data;
    const mask = maskData.data;
    
    // Multi-pass intelligent inpainting
    const patchSize = 11;
    const searchRadius = 60;
    const iterations = 3;
    
    for (let iter = 0; iter < iterations; iter++) {
      for (let y = 0; y < imageData.height; y++) {
        for (let x = 0; x < imageData.width; x++) {
          const idx = (y * imageData.width + x) * 4;
          
          if (mask[idx] > 128) { // Masked pixel needs inpainting
            const bestMatch = this.findBestPatchMatch(imageData, x, y, patchSize, searchRadius, maskData);
            if (bestMatch) {
              // Weighted blending for smoother results
              const weight = 0.6 + 0.4 * (iter / iterations);
              data[idx] = Math.round(data[idx] * (1 - weight) + bestMatch.r * weight);
              data[idx + 1] = Math.round(data[idx + 1] * (1 - weight) + bestMatch.g * weight);
              data[idx + 2] = Math.round(data[idx + 2] * (1 - weight) + bestMatch.b * weight);
            }
          }
        }
      }
    }
    
    // Final edge smoothing pass
    this.edgeAwareSmoothing(result, maskData);
    
    return result;
  }

  private findBestPatchMatch(
    imageData: ImageData,
    x: number,
    y: number,
    patchSize: number,
    searchRadius: number,
    maskData: ImageData
  ): { r: number; g: number; b: number } | null {
    let bestScore = Infinity;
    let bestColor = null;
    
    const halfPatch = Math.floor(patchSize / 2);
    
    for (let sy = Math.max(halfPatch, y - searchRadius); 
         sy < Math.min(imageData.height - halfPatch, y + searchRadius); sy++) {
      for (let sx = Math.max(halfPatch, x - searchRadius); 
           sx < Math.min(imageData.width - halfPatch, x + searchRadius); sx++) {
        
        const maskIdx = (sy * imageData.width + sx) * 4;
        if (maskData.data[maskIdx] > 128) continue; // Skip masked areas
        
        const score = this.computePatchSimilarity(imageData, x, y, sx, sy, patchSize, maskData);
        
        if (score < bestScore) {
          bestScore = score;
          const idx = (sy * imageData.width + sx) * 4;
          bestColor = {
            r: imageData.data[idx],
            g: imageData.data[idx + 1],
            b: imageData.data[idx + 2]
          };
        }
      }
    }
    
    return bestColor;
  }

  private computePatchSimilarity(
    imageData: ImageData,
    x1: number, y1: number,
    x2: number, y2: number,
    patchSize: number,
    maskData: ImageData
  ): number {
    let totalError = 0;
    let validPixels = 0;
    const halfPatch = Math.floor(patchSize / 2);
    
    for (let dy = -halfPatch; dy <= halfPatch; dy++) {
      for (let dx = -halfPatch; dx <= halfPatch; dx++) {
        const px1 = x1 + dx, py1 = y1 + dy;
        const px2 = x2 + dx, py2 = y2 + dy;
        
        if (px1 >= 0 && px1 < imageData.width && py1 >= 0 && py1 < imageData.height &&
            px2 >= 0 && px2 < imageData.width && py2 >= 0 && py2 < imageData.height) {
          
          const idx1 = (py1 * imageData.width + px1) * 4;
          const idx2 = (py2 * imageData.width + px2) * 4;
          
          // Only compare unmasked pixels
          if (maskData.data[idx1] <= 128) {
            const dr = imageData.data[idx1] - imageData.data[idx2];
            const dg = imageData.data[idx1 + 1] - imageData.data[idx2 + 1];
            const db = imageData.data[idx1 + 2] - imageData.data[idx2 + 2];
            
            totalError += dr * dr + dg * dg + db * db;
            validPixels++;
          }
        }
      }
    }
    
    return validPixels > 0 ? totalError / validPixels : Infinity;
  }

  private edgeAwareSmoothing(imageData: ImageData, maskData: ImageData): void {
    const width = imageData.width;
    const height = imageData.height;
    const data = imageData.data;
    const smoothed = new Uint8ClampedArray(data);
    
    const kernelSize = 3;
    const halfKernel = Math.floor(kernelSize / 2);
    
    for (let y = halfKernel; y < height - halfKernel; y++) {
      for (let x = halfKernel; x < width - halfKernel; x++) {
        const idx = (y * width + x) * 4;
        
        if (maskData.data[idx] > 128) { // Only smooth masked areas
          let totalR = 0, totalG = 0, totalB = 0, totalWeight = 0;
          
          for (let dy = -halfKernel; dy <= halfKernel; dy++) {
            for (let dx = -halfKernel; dx <= halfKernel; dx++) {
              const nx = x + dx, ny = y + dy;
              const nIdx = (ny * width + nx) * 4;
              
              // Gaussian-like weighting
              const distance = Math.sqrt(dx * dx + dy * dy);
              const weight = Math.exp(-distance * distance / 2.0);
              
              totalR += data[nIdx] * weight;
              totalG += data[nIdx + 1] * weight;
              totalB += data[nIdx + 2] * weight;
              totalWeight += weight;
            }
          }
          
          if (totalWeight > 0) {
            smoothed[idx] = Math.round(totalR / totalWeight);
            smoothed[idx + 1] = Math.round(totalG / totalWeight);
            smoothed[idx + 2] = Math.round(totalB / totalWeight);
          }
        }
      }
    }
    
    imageData.data.set(smoothed);
  }

  async processInpainting(request: InpaintingRequest): Promise<InpaintingResponse> {
    const startTime = performance.now();
    const warnings: string[] = [];

    try {
      if (!this.isInitialized) {
        await this.initializeORT();
      }

      if (!this.gpuInfo) {
        await this.detectGPU();
      }

      // Add warning for Intel integrated graphics
      if (this.gpuInfo?.type === 'intel-integrated') {
        warnings.push('Intel integrated graphics detected. For optimal object removal quality, consider using a system with dedicated NVIDIA or AMD GPU.');
      }

      // Select model
      const selectedModel = this.selectOptimalModel(request.modelType);
      
      // Load model if needed
      if (!this.session || this.currentModel !== selectedModel) {
        console.log(`Loading model: ${selectedModel}`);
        try {
          this.session = await this.loadModel(selectedModel);
          this.currentModel = selectedModel;
        } catch (error) {
          console.warn('Failed to load neural model, using CPU fallback:', error);
          this.session = null;
          warnings.push('Neural model loading failed. Using advanced CPU algorithms.');
        }
      }

      let resultImageData: ImageData;
      let preprocessTime = 0;
      let inferenceTime = 0;
      let postprocessTime = 0;
      let acceleration = 'CPU-Fallback';

      if (this.session) {
        // Neural inference path
        const preprocessStart = performance.now();
        const { imageTensor, maskTensor, originalSize } = this.preprocessInputs(request.imageData, request.maskData);
        preprocessTime = performance.now() - preprocessStart;

        const inferenceStart = performance.now();
        try {
          const feeds = { image: imageTensor, mask: maskTensor };
          const outputs = await this.session.run(feeds);
          const outputTensor = outputs[Object.keys(outputs)[0]] as ort.Tensor;
          inferenceTime = performance.now() - inferenceStart;

          const postprocessStart = performance.now();
          resultImageData = this.postprocessOutput(outputTensor, originalSize);
          postprocessTime = performance.now() - postprocessStart;

          // Determine acceleration type
          const providers = (this.session as any)._executionProviders || [];
          if (providers.includes('webgpu')) acceleration = 'WebGPU';
          else if (providers.includes('webgl')) acceleration = 'WebGL';
          else acceleration = 'WebAssembly';

        } catch (error) {
          console.warn('Neural inference failed, using CPU fallback:', error);
          warnings.push('Neural inference failed. Using advanced CPU algorithms.');
          
          inferenceTime = performance.now() - inferenceStart;
          const fallbackStart = performance.now();
          resultImageData = this.advancedFallbackInpainting(request.imageData, request.maskData);
          postprocessTime = performance.now() - fallbackStart;
          acceleration = 'CPU-Fallback';
        }
      } else {
        // CPU fallback path
        const fallbackStart = performance.now();
        resultImageData = this.advancedFallbackInpainting(request.imageData, request.maskData);
        postprocessTime = performance.now() - fallbackStart;
      }

      const totalTime = performance.now() - startTime;

      return {
        success: true,
        resultImageData,
        performanceStats: {
          preprocessTime,
          inferenceTime,
          postprocessTime,
          totalTime,
          modelUsed: this.models[selectedModel]?.displayName || 'CPU Fallback',
          acceleration,
          gpuType: this.gpuInfo?.type || 'unknown'
        },
        warnings: warnings.length > 0 ? warnings : undefined
      };

    } catch (error) {
      console.error('Object removal failed:', error);
      
      // Ultimate fallback
      try {
        const fallbackResult = this.advancedFallbackInpainting(request.imageData, request.maskData);
        const totalTime = performance.now() - startTime;
        
        return {
          success: true,
          resultImageData: fallbackResult,
          performanceStats: {
            preprocessTime: 0,
            inferenceTime: 0,
            postprocessTime: totalTime,
            totalTime,
            modelUsed: 'Emergency CPU Fallback',
            acceleration: 'CPU-Emergency',
            gpuType: this.gpuInfo?.type || 'unknown'
          },
          warnings: [`Processing failed: ${error}. Used emergency CPU algorithm.`]
        };
      } catch (fallbackError) {
        return {
          success: false,
          error: `Object removal failed: ${error}. Fallback also failed: ${fallbackError}`
        };
      }
    }
  }

  getGPUInfo(): GPUInfo | null {
    return this.gpuInfo;
  }
}

// Worker instance
const processor = new ObjectRemovalProcessor();

// Message handler
self.onmessage = async (event: MessageEvent) => {
  const { command, imageData, maskData, modelType = 'auto', quality = 'balanced' } = event.data;

  try {
    switch (command) {
      case 'initialize':
        await processor.initializeORT();
        self.postMessage({ 
          status: 'worker_initialized',
          gpuInfo: processor.getGPUInfo()
        });
        break;

      case 'process':
        if (!imageData || !maskData) {
          self.postMessage({ 
            status: 'error', 
            error: 'Missing image or mask data' 
          });
          return;
        }

        // Report progress
        self.postMessage({ 
          status: 'processing', 
          message: 'Initializing AI models...',
          progress: 10
        });

        const request: InpaintingRequest = {
          imageData,
          maskData,
          modelType,
          quality
        };

        self.postMessage({ 
          status: 'processing', 
          message: 'Loading neural network model...',
          progress: 20
        });

        const response = await processor.processInpainting(request);

        self.postMessage({ 
          status: 'processing', 
          message: 'Processing complete',
          progress: 100
        });

        if (response.success) {
          self.postMessage({
            status: 'complete',
            resultImageData: response.resultImageData,
            performanceStats: response.performanceStats,
            warnings: response.warnings
          });
        } else {
          self.postMessage({
            status: 'error',
            error: response.error || 'Processing failed'
          });
        }
        break;

      default:
        self.postMessage({ 
          status: 'error', 
          error: `Unknown command: ${command}` 
        });
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({ 
      status: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
};

export {}; 