/**
 * REAL AOT-GAN NEURAL INPAINTING WORKER
 * Uses ONNX.js with WebGL/WebGPU acceleration for actual neural network processing
 */

// Import with try-catch for environments where onnxruntime-web might not be available
let ort: any;
try {
  ort = require('onnxruntime-web');
} catch (e) {
  console.warn('ONNX.js not available, using fallback only');
}

interface InpaintingData {
  imageData: ImageData;
  maskData: ImageData;
  width: number;
  height: number;
}

class RealAOTGANInpainter {
  private session: any = null;
  private isLoaded = false;
  private useGPU = false;
  private gpuProvider = '';

  async initialize(progressCallback?: (progress: number) => void): Promise<void> {
    console.log('🚀 Initializing Real AOT-GAN Neural Network...');
    progressCallback?.(10);

    try {
      // Configure ONNX Runtime with GPU acceleration priority
      await this.setupGPUAcceleration();
      progressCallback?.(30);

      // Try to load real ONNX model first, fallback to demo model
      progressCallback?.(50);
      await this.loadModel();
      progressCallback?.(80);

      this.isLoaded = true;
      console.log(`✅ AOT-GAN loaded successfully with ${this.gpuProvider} acceleration`);
      progressCallback?.(100);

    } catch (error) {
      console.warn('⚠️ Could not load ONNX model, using enhanced fallback:', error);
      // Initialize enhanced fallback algorithm
      await this.initializeFallback();
      this.isLoaded = true;
      progressCallback?.(100);
    }
  }

  private async setupGPUAcceleration(): Promise<void> {
    // Configure ONNX Runtime to prefer dedicated GPU over integrated graphics
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.15.1/dist/';
    
    console.log('🔍 Detecting available graphics processors...');
    
    // Check for WebGPU support (most advanced) with explicit adapter selection
    if ('gpu' in navigator) {
      try {
        // Try to get high-performance adapter first (dedicated GPU)
        const adapter = await (navigator as any).gpu.requestAdapter({
          powerPreference: 'high-performance',
          forceFallbackAdapter: false
        });
        
        if (adapter) {
          const info = adapter.info;
          console.log('🎮 WebGPU Adapter Found:', {
            vendor: info?.vendor || 'Unknown',
            device: info?.device || 'Unknown',
            description: info?.description || 'Unknown'
          });
          
          // Prioritize NVIDIA (GTX 1650) over Intel
          if (info?.vendor && (
            info.vendor.toLowerCase().includes('nvidia') ||
            info.vendor.toLowerCase().includes('geforce') ||
            info.description?.toLowerCase().includes('gtx') ||
            info.description?.toLowerCase().includes('rtx')
          )) {
            this.gpuProvider = 'webgpu-nvidia';
            this.useGPU = true;
            console.log('✅ Using NVIDIA GPU via WebGPU:', info.description || info.vendor);
            return;
          }
          
          // Fallback to any non-Intel adapter
          if (info?.vendor && !info.vendor.toLowerCase().includes('intel')) {
            this.gpuProvider = 'webgpu-dedicated';
            this.useGPU = true;
            console.log('✅ Using dedicated GPU via WebGPU:', info.description || info.vendor);
            return;
          }
        }
      } catch (e) {
        console.log('WebGPU high-performance adapter not available, trying WebGL...');
      }
    }

    // Enhanced WebGL detection with multiple methods
    const canvas = new OffscreenCanvas(1, 1);
    const gl = canvas.getContext('webgl2', { 
      powerPreference: 'high-performance',
      antialias: false,
      depth: false
    }) || canvas.getContext('webgl', { 
      powerPreference: 'high-performance',
      antialias: false,
      depth: false
    });
    
    if (gl) {
      // Get detailed renderer information
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      let renderer = 'Unknown';
      let vendor = 'Unknown';
      
      if (debugInfo) {
        renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
        vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
      }
      
      console.log('🎮 WebGL Renderer Details:', { vendor, renderer });
      
      // Aggressive NVIDIA/GTX detection
      const isNvidia = renderer.toLowerCase().includes('nvidia') ||
                      renderer.toLowerCase().includes('geforce') ||
                      renderer.toLowerCase().includes('gtx') ||
                      renderer.toLowerCase().includes('rtx') ||
                      vendor.toLowerCase().includes('nvidia');
      
      const isAMD = renderer.toLowerCase().includes('amd') ||
                    renderer.toLowerCase().includes('radeon') ||
                    vendor.toLowerCase().includes('ati');
      
      const isIntel = renderer.toLowerCase().includes('intel') ||
                      renderer.toLowerCase().includes('uhd') ||
                      vendor.toLowerCase().includes('intel');
      
      if (isNvidia) {
        this.gpuProvider = 'webgl-nvidia';
        this.useGPU = true;
        console.log('✅ NVIDIA GPU detected via WebGL:', renderer);
        
        // Force specific optimizations for NVIDIA
        if (ort && ort.env) {
          ort.env.webgl = {
            powerPreference: 'high-performance',
            contextAttributes: {
              alpha: false,
              antialias: false,
              depth: false,
              stencil: false,
              powerPreference: 'high-performance'
            }
          };
        }
        return;
      }
      
      if (isAMD) {
        this.gpuProvider = 'webgl-amd';
        this.useGPU = true;
        console.log('✅ AMD GPU detected via WebGL:', renderer);
        return;
      }
      
      // Only use Intel as last resort
      if (isIntel) {
        this.gpuProvider = 'webgl-intel-fallback';
        this.useGPU = false; // Treat Intel as CPU fallback for better performance
        console.log('⚠️ Intel graphics detected, using CPU processing for better performance');
      } else {
        // Unknown GPU, try to use it
        this.gpuProvider = 'webgl-unknown';
        this.useGPU = true;
        console.log('🔧 Unknown GPU detected, attempting hardware acceleration:', renderer);
      }
    } else {
      this.gpuProvider = 'cpu-only';
      this.useGPU = false;
      console.log('❌ No WebGL support, using CPU-only processing');
    }
    
    console.log(`🖥️ Final configuration: ${this.gpuProvider} (GPU: ${this.useGPU})`);
  }

  private async loadModel(): Promise<void> {
    try {
      // Try to load actual AOT-GAN ONNX model
      const modelPath = '/models/aot-gan-inpainting.onnx';
      
      const executionProviders = this.useGPU 
        ? ['webgl', 'wasm'] 
        : ['wasm'];

      this.session = await ort.InferenceSession.create(modelPath, {
        executionProviders,
        graphOptimizationLevel: 'all',
        executionMode: 'parallel'
      });

      console.log('✅ ONNX AOT-GAN model loaded successfully');
    } catch (error) {
      console.log('📁 ONNX model not found, will use neural-inspired fallback');
      throw error; // Let caller handle fallback
    }
  }

  private async initializeFallback(): Promise<void> {
    console.log('🧠 Initializing Neural-Inspired Fallback Algorithm...');
    // Enhanced fallback is ready
  }

  async inpaint(
    imageData: ImageData,
    maskData: ImageData,
    progressCallback?: (progress: number) => void
  ): Promise<ImageData> {
    if (!this.isLoaded) {
      throw new Error('Model not loaded. Call initialize() first.');
    }

    console.log(`🎨 Running inpainting with ${this.session ? 'ONNX AOT-GAN' : 'Enhanced Fallback'}`);
    
    if (this.session) {
      return this.onnxInpaint(imageData, maskData, progressCallback);
    } else {
      return this.enhancedFallbackInpaint(imageData, maskData, progressCallback);
    }
  }

  private async onnxInpaint(
    imageData: ImageData,
    maskData: ImageData,
    progressCallback?: (progress: number) => void
  ): Promise<ImageData> {
    if (!this.session) throw new Error('ONNX session not available');

    progressCallback?.(20);

    // Preprocess inputs for ONNX model
    const { imageTensor, maskTensor } = this.preprocessForONNX(imageData, maskData);
    progressCallback?.(40);

    // Run ONNX inference
    const feeds = {
      'image': imageTensor,
      'mask': maskTensor
    };

    const results = await this.session.run(feeds);
    progressCallback?.(80);

    // Postprocess output
    const outputTensor = results['inpainted_image'];
    const resultImageData = this.postprocessONNXOutput(outputTensor, imageData.width, imageData.height);
    
    // Cleanup tensors
    if (imageTensor && imageTensor.dispose) imageTensor.dispose();
    if (maskTensor && maskTensor.dispose) maskTensor.dispose();
    if (outputTensor && outputTensor.dispose) outputTensor.dispose();

    progressCallback?.(100);
    return resultImageData;
  }

  private preprocessForONNX(imageData: ImageData, maskData: ImageData) {
    // Resize to model input size (512x512 for AOT-GAN)
    const modelSize = 512;
    const resizedImage = this.resizeImageData(imageData, modelSize, modelSize);
    const resizedMask = this.resizeImageData(maskData, modelSize, modelSize);
    
    // Convert to ONNX tensors
    const imageTensor = this.imageDataToONNXTensor(resizedImage, true); // Normalize to [-1, 1]
    const maskTensor = this.maskDataToONNXTensor(resizedMask);
    
    return { imageTensor, maskTensor };
  }

  private imageDataToONNXTensor(imageData: ImageData, normalize = false): any {
    const { width, height, data } = imageData;
    const tensor = new Float32Array(3 * width * height);
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      const r = data[i] / 255;
      const g = data[i + 1] / 255;
      const b = data[i + 2] / 255;
      
      // Normalize to [-1, 1] if requested (AOT-GAN expects this)
      const normalizedR = normalize ? r * 2 - 1 : r;
      const normalizedG = normalize ? g * 2 - 1 : g;
      const normalizedB = normalize ? b * 2 - 1 : b;
      
      // NCHW format (Batch, Channels, Height, Width)
      tensor[0 * width * height + pixelIndex] = normalizedR;
      tensor[1 * width * height + pixelIndex] = normalizedG;
      tensor[2 * width * height + pixelIndex] = normalizedB;
    }
    
    return ort ? new ort.Tensor('float32', tensor, [1, 3, height, width]) : null;
  }

  private maskDataToONNXTensor(maskData: ImageData): any {
    const { width, height, data } = maskData;
    const tensor = new Float32Array(width * height);
    
    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const a = data[i + 3];
      
      // Detect red brush strokes and convert to binary mask
      const isRedMask = r > 150 && g < 100 && b < 100 && a > 100;
      tensor[pixelIndex] = isRedMask ? 1.0 : 0.0;
    }
    
    return ort ? new ort.Tensor('float32', tensor, [1, 1, height, width]) : null;
  }

  private postprocessONNXOutput(outputTensor: any, originalWidth: number, originalHeight: number): ImageData {
    const dims = outputTensor.dims;
    const data = outputTensor.data as Float32Array;
    const width = dims[3];
    const height = dims[2];
    
    // Create output ImageData
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    
    // Convert from NCHW to RGBA
    for (let i = 0; i < width * height; i++) {
      const r = Math.round((data[0 * width * height + i] + 1) * 127.5);
      const g = Math.round((data[1 * width * height + i] + 1) * 127.5);
      const b = Math.round((data[2 * width * height + i] + 1) * 127.5);
      
      imageData.data[i * 4] = Math.max(0, Math.min(255, r));
      imageData.data[i * 4 + 1] = Math.max(0, Math.min(255, g));
      imageData.data[i * 4 + 2] = Math.max(0, Math.min(255, b));
      imageData.data[i * 4 + 3] = 255;
    }
    
    // Resize back to original dimensions
    if (width !== originalWidth || height !== originalHeight) {
      return this.resizeImageData(imageData, originalWidth, originalHeight);
    }
    
    return imageData;
  }

  private async enhancedFallbackInpaint(
    imageData: ImageData,
    maskData: ImageData,
    progressCallback?: (progress: number) => void
  ): Promise<ImageData> {
    console.log('🧠 Using Enhanced Neural-Inspired Algorithm...');
    
    const result = new ImageData(
      new Uint8ClampedArray(imageData.data),
      imageData.width,
      imageData.height
    );
    
    progressCallback?.(20);
    
    // Create high-quality binary mask
    const binaryMask = this.createAdvancedMask(maskData);
    progressCallback?.(30);
    
    // Apply multi-scale neural-inspired inpainting
    await this.multiScaleInpainting(result, binaryMask, progressCallback);
    progressCallback?.(90);

    // Post-process with edge enhancement
    this.enhanceEdges(result, binaryMask);
    progressCallback?.(100);
    
    return result;
  }

  private createAdvancedMask(maskData: ImageData): Uint8Array {
    const mask = new Uint8Array(maskData.width * maskData.height);
    
    for (let i = 0; i < maskData.data.length; i += 4) {
      const r = maskData.data[i];
      const g = maskData.data[i + 1];
      const b = maskData.data[i + 2];
      const a = maskData.data[i + 3];
      
      // Better red detection with anti-aliasing consideration
      const redIntensity = r - Math.max(g, b);
      const isRedMask = redIntensity > 50 && r > 100 && a > 50;
      mask[i / 4] = isRedMask ? 255 : 0;
    }
    
    // Apply morphological operations to clean up mask
    return this.morphologicalClose(mask, maskData.width, maskData.height);
  }

  private morphologicalClose(mask: Uint8Array, width: number, height: number): Uint8Array {
    // Dilate then erode to fill small gaps
    const dilated = this.dilate(mask, width, height, 2);
    return this.erode(dilated, width, height, 2);
  }

  private dilate(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
    const result = new Uint8Array(mask.length);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        let maxVal = 0;
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              maxVal = Math.max(maxVal, mask[nIdx]);
            }
          }
        }
        
        result[idx] = maxVal;
      }
    }
    
    return result;
  }

  private erode(mask: Uint8Array, width: number, height: number, radius: number): Uint8Array {
    const result = new Uint8Array(mask.length);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = y * width + x;
        let minVal = 255;
        
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            const nx = x + dx;
            const ny = y + dy;
            
            if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
              const nIdx = ny * width + nx;
              minVal = Math.min(minVal, mask[nIdx]);
            }
          }
        }
        
        result[idx] = minVal;
      }
    }
    
    return result;
  }

  private async multiScaleInpainting(
    imageData: ImageData,
    mask: Uint8Array,
    progressCallback?: (progress: number) => void
  ): Promise<void> {
    // Multi-scale approach: process from coarse to fine
    const scales = [0.25, 0.5, 1.0];
    
    for (let i = 0; i < scales.length; i++) {
      const scale = scales[i];
      const scaledWidth = Math.round(imageData.width * scale);
      const scaledHeight = Math.round(imageData.height * scale);
      
      // Create scaled versions
      const scaledImage = this.resizeImageData(imageData, scaledWidth, scaledHeight);
      const scaledMask = this.resizeMask(mask, imageData.width, imageData.height, scaledWidth, scaledHeight);
      
      // Apply neural-inspired inpainting at this scale
      await this.neuralInpaintingAtScale(scaledImage, scaledMask);
      
      // Resize back and blend
      if (scale < 1.0) {
        const upscaled = this.resizeImageData(scaledImage, imageData.width, imageData.height);
        this.blendResults(imageData, upscaled, mask, 0.3); // Gentle blending
      } else {
        // Final scale - copy directly
        imageData.data.set(scaledImage.data);
      }
      
      const progress = 30 + (i / scales.length) * 50;
      progressCallback?.(progress);
    }
  }

  private async neuralInpaintingAtScale(imageData: ImageData, mask: Uint8Array): Promise<void> {
    // Get boundary pixels with priority
    const pixels = this.getAdvancedPriorityPixels(mask, imageData.width, imageData.height);
    
    for (let i = 0; i < pixels.length && i < 5000; i++) { // Limit for performance
      const { x, y } = pixels[i];
      
      if (mask[y * imageData.width + x] !== 255) continue;
      
      // Find best matching patch using advanced similarity
      const bestPatch = this.findNeuralPatch(imageData, mask, x, y);
      
      if (bestPatch) {
        this.copyAdvancedPatch(imageData, bestPatch.x, bestPatch.y, x, y, bestPatch.confidence);
        mask[y * imageData.width + x] = 128; // Mark as filled
      }
      
      if (i % 50 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1)); // Yield to main thread
      }
    }
  }

  private getAdvancedPriorityPixels(mask: Uint8Array, width: number, height: number) {
    const pixels: Array<{x: number, y: number, priority: number}> = [];
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = y * width + x;
        if (mask[idx] === 255) {
          const priority = this.calculateAdvancedPriority(mask, x, y, width, height);
          if (priority > 0) {
            pixels.push({x, y, priority});
          }
        }
      }
    }
    
    return pixels.sort((a, b) => b.priority - a.priority);
  }

  private calculateAdvancedPriority(mask: Uint8Array, x: number, y: number, width: number, height: number): number {
    let boundaryPixels = 0;
    let totalPixels = 0;
    let edgeStrength = 0;
    
    for (let dy = -2; dy <= 2; dy++) {
      for (let dx = -2; dx <= 2; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          totalPixels++;
          if (mask[ny * width + nx] === 0) {
            boundaryPixels++;
            // Add edge strength based on distance to center
            const distance = Math.sqrt(dx * dx + dy * dy);
            edgeStrength += 1 / (1 + distance);
          }
        }
      }
    }
    
    const boundaryRatio = totalPixels > 0 ? boundaryPixels / totalPixels : 0;
    return boundaryRatio * edgeStrength;
  }

  private findNeuralPatch(
    imageData: ImageData,
    mask: Uint8Array,
    x: number,
    y: number
  ): { x: number; y: number; confidence: number } | null {
    let bestPatch: { x: number; y: number; confidence: number } | null = null;
    const patchSize = 15; // Larger patch for better context
    const searchRadius = Math.min(100, Math.max(imageData.width, imageData.height) / 4);
    
    // Multi-scale patch matching
    const scales = [1.0, 0.8, 1.2];
    
    for (const scale of scales) {
      const scaledPatchSize = Math.round(patchSize * scale);
      
      for (let dy = -searchRadius; dy <= searchRadius; dy += 3) {
        for (let dx = -searchRadius; dx <= searchRadius; dx += 3) {
          const sourceX = x + dx;
          const sourceY = y + dy;
          
          if (!this.isValidPatch(sourceX, sourceY, scaledPatchSize, imageData.width, imageData.height) ||
              this.patchOverlapsMask(mask, sourceX, sourceY, scaledPatchSize, imageData.width)) {
            continue;
          }
          
          const similarity = this.calculateNeuralSimilarity(
            imageData, mask, x, y, sourceX, sourceY, scaledPatchSize
          );
          
          if (!bestPatch || similarity > bestPatch.confidence) {
            bestPatch = { x: sourceX, y: sourceY, confidence: similarity };
          }
        }
      }
    }
    
    return bestPatch;
  }

  private calculateNeuralSimilarity(
    imageData: ImageData,
    mask: Uint8Array,
    targetX: number,
    targetY: number,
    sourceX: number,
    sourceY: number,
    patchSize: number
  ): number {
    const halfPatch = Math.floor(patchSize / 2);
    let totalDiff = 0;
    let validPixels = 0;
    let structuralSimilarity = 0;
    
    // Calculate both color and structural similarity
    for (let dy = -halfPatch; dy <= halfPatch; dy++) {
      for (let dx = -halfPatch; dx <= halfPatch; dx++) {
        const tx = targetX + dx;
        const ty = targetY + dy;
        const sx = sourceX + dx;
        const sy = sourceY + dy;
        
        if (tx >= 0 && tx < imageData.width && ty >= 0 && ty < imageData.height &&
            sx >= 0 && sx < imageData.width && sy >= 0 && sy < imageData.height) {
          
          if (mask[ty * imageData.width + tx] === 255) continue;
          
          const tIdx = (ty * imageData.width + tx) * 4;
          const sIdx = (sy * imageData.width + sx) * 4;
          
          // Color similarity
          const dr = imageData.data[tIdx] - imageData.data[sIdx];
          const dg = imageData.data[tIdx + 1] - imageData.data[sIdx + 1];
          const db = imageData.data[tIdx + 2] - imageData.data[sIdx + 2];
          
          totalDiff += Math.sqrt(dr * dr + dg * dg + db * db);
          
          // Structural similarity (gradient comparison)
          if (dx > -halfPatch && dy > -halfPatch) {
            const tGradX = this.getGradient(imageData, tx, ty, 'x');
            const sGradX = this.getGradient(imageData, sx, sy, 'x');
            const tGradY = this.getGradient(imageData, tx, ty, 'y');
            const sGradY = this.getGradient(imageData, sx, sy, 'y');
            
            const gradDiff = Math.abs(tGradX - sGradX) + Math.abs(tGradY - sGradY);
            structuralSimilarity += 1 / (1 + gradDiff);
          }
          
          validPixels++;
        }
      }
    }
    
    if (validPixels === 0) return 0;
    
    const colorSimilarity = 1 / (1 + totalDiff / validPixels);
    const avgStructuralSimilarity = structuralSimilarity / validPixels;
    
    // Combine color and structural similarity
    return 0.7 * colorSimilarity + 0.3 * avgStructuralSimilarity;
  }

  private getGradient(imageData: ImageData, x: number, y: number, direction: 'x' | 'y'): number {
    const { width, height } = imageData;
    if (x <= 0 || x >= width - 1 || y <= 0 || y >= height - 1) return 0;
    
    if (direction === 'x') {
      const leftIdx = (y * width + (x - 1)) * 4;
      const rightIdx = (y * width + (x + 1)) * 4;
      
      const leftLuma = 0.299 * imageData.data[leftIdx] + 0.587 * imageData.data[leftIdx + 1] + 0.114 * imageData.data[leftIdx + 2];
      const rightLuma = 0.299 * imageData.data[rightIdx] + 0.587 * imageData.data[rightIdx + 1] + 0.114 * imageData.data[rightIdx + 2];
      
      return rightLuma - leftLuma;
    } else {
      const topIdx = ((y - 1) * width + x) * 4;
      const bottomIdx = ((y + 1) * width + x) * 4;
      
      const topLuma = 0.299 * imageData.data[topIdx] + 0.587 * imageData.data[topIdx + 1] + 0.114 * imageData.data[topIdx + 2];
      const bottomLuma = 0.299 * imageData.data[bottomIdx] + 0.587 * imageData.data[bottomIdx + 1] + 0.114 * imageData.data[bottomIdx + 2];
      
      return bottomLuma - topLuma;
    }
  }

  private copyAdvancedPatch(
    imageData: ImageData,
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    confidence: number
  ): void {
    const patchSize = 15;
    const halfPatch = Math.floor(patchSize / 2);
    
    for (let dy = -halfPatch; dy <= halfPatch; dy++) {
      for (let dx = -halfPatch; dx <= halfPatch; dx++) {
        const sx = sourceX + dx;
        const sy = sourceY + dy;
        const tx = targetX + dx;
        const ty = targetY + dy;
        
        if (sx >= 0 && sx < imageData.width && sy >= 0 && sy < imageData.height &&
            tx >= 0 && tx < imageData.width && ty >= 0 && ty < imageData.height) {
          
          const sIdx = (sy * imageData.width + sx) * 4;
          const tIdx = (ty * imageData.width + tx) * 4;
          
          // Apply feathering based on distance from center and confidence
          const distance = Math.sqrt(dx * dx + dy * dy);
          const weight = confidence * Math.exp(-distance / 5);
          
          imageData.data[tIdx] = imageData.data[tIdx] * (1 - weight) + imageData.data[sIdx] * weight;
          imageData.data[tIdx + 1] = imageData.data[tIdx + 1] * (1 - weight) + imageData.data[sIdx + 1] * weight;
          imageData.data[tIdx + 2] = imageData.data[tIdx + 2] * (1 - weight) + imageData.data[sIdx + 2] * weight;
        }
      }
    }
  }

  private blendResults(target: ImageData, source: ImageData, mask: Uint8Array, alpha: number): void {
    for (let i = 0; i < target.data.length; i += 4) {
      const pixelIdx = i / 4;
      if (mask[pixelIdx] === 255) {
        target.data[i] = target.data[i] * (1 - alpha) + source.data[i] * alpha;
        target.data[i + 1] = target.data[i + 1] * (1 - alpha) + source.data[i + 1] * alpha;
        target.data[i + 2] = target.data[i + 2] * (1 - alpha) + source.data[i + 2] * alpha;
      }
    }
  }

  private enhanceEdges(imageData: ImageData, mask: Uint8Array): void {
    // Apply edge enhancement to improve visual quality
    const enhanced = new Uint8ClampedArray(imageData.data);
    
    for (let y = 1; y < imageData.height - 1; y++) {
      for (let x = 1; x < imageData.width - 1; x++) {
        const idx = y * imageData.width + x;
        if (mask[idx] === 128) { // Recently filled pixel
          const pixelIdx = idx * 4;
          
          // Apply unsharp mask
          for (let c = 0; c < 3; c++) {
            const center = imageData.data[pixelIdx + c];
            let neighbors = 0;
            
            // 3x3 kernel
            for (let dy = -1; dy <= 1; dy++) {
              for (let dx = -1; dx <= 1; dx++) {
                if (dx === 0 && dy === 0) continue;
                const nIdx = ((y + dy) * imageData.width + (x + dx)) * 4;
                neighbors += imageData.data[nIdx + c];
              }
            }
            
            const avgNeighbor = neighbors / 8;
            const sharpened = center + 0.3 * (center - avgNeighbor);
            enhanced[pixelIdx + c] = Math.max(0, Math.min(255, sharpened));
          }
        }
      }
    }
    
    imageData.data.set(enhanced);
  }

  private resizeImageData(imageData: ImageData, newWidth: number, newHeight: number): ImageData {
    const canvas = new OffscreenCanvas(newWidth, newHeight);
    const ctx = canvas.getContext('2d')!;
    
    const tempCanvas = new OffscreenCanvas(imageData.width, imageData.height);
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.putImageData(imageData, 0, 0);
    
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(tempCanvas, 0, 0, newWidth, newHeight);
    
    return ctx.getImageData(0, 0, newWidth, newHeight);
  }

  private resizeMask(mask: Uint8Array, oldWidth: number, oldHeight: number, newWidth: number, newHeight: number): Uint8Array {
    const newMask = new Uint8Array(newWidth * newHeight);
    
    for (let y = 0; y < newHeight; y++) {
      for (let x = 0; x < newWidth; x++) {
        const srcX = Math.round((x / newWidth) * oldWidth);
        const srcY = Math.round((y / newHeight) * oldHeight);
        const srcIdx = Math.min(srcY * oldWidth + srcX, mask.length - 1);
        newMask[y * newWidth + x] = mask[srcIdx];
      }
    }
    
    return newMask;
  }

  private isValidPatch(x: number, y: number, patchSize: number, width: number, height: number): boolean {
    const halfPatch = Math.floor(patchSize / 2);
    return x >= halfPatch && x < width - halfPatch && y >= halfPatch && y < height - halfPatch;
  }

  private patchOverlapsMask(mask: Uint8Array, x: number, y: number, patchSize: number, width: number): boolean {
    const halfPatch = Math.floor(patchSize / 2);
    
    for (let dy = -halfPatch; dy <= halfPatch; dy++) {
      for (let dx = -halfPatch; dx <= halfPatch; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        const idx = ny * width + nx;
        
        if (idx >= 0 && idx < mask.length && mask[idx] === 255) {
          return true;
        }
      }
    }
    
    return false;
  }

  getModelInfo() {
    return {
      isLoaded: this.isLoaded,
      modelType: this.session ? 'Real AOT-GAN ONNX' : 'Enhanced Neural-Inspired',
      backend: this.gpuProvider || 'cpu',
      useGPU: this.useGPU,
      description: this.session 
        ? 'ONNX.js AOT-GAN with GPU acceleration'
        : 'Advanced neural-inspired algorithm with multi-scale processing'
    };
  }

  dispose(): void {
    if (this.session) {
      this.session = null;
    }
    this.isLoaded = false;
  }
}

const aotganInpainter = new RealAOTGANInpainter();

self.onmessage = async (event) => {
  const { type, data } = event.data;

  try {
    switch (type) {
      case 'LOAD_MODEL':
        await aotganInpainter.initialize((progress) => {
          self.postMessage({
            type: 'MODEL_LOADING_PROGRESS',
            data: { progress }
          });
        });
        
        self.postMessage({
          type: 'MODEL_LOADED',
          data: { 
            success: true,
            modelInfo: aotganInpainter.getModelInfo()
          }
        });
        break;

      case 'INPAINT':
        const { imageData, maskData } = data as InpaintingData;
        
        const result = await aotganInpainter.inpaint(imageData, maskData, (progress) => {
          self.postMessage({
            type: 'INPAINTING_PROGRESS',
            progress: progress
          });
        });
        
        self.postMessage({
          type: 'INPAINTING_COMPLETE',
          data: result
        });
        break;

      case 'GET_MODEL_INFO':
        self.postMessage({
          type: 'MODEL_INFO',
          data: aotganInpainter.getModelInfo()
        });
        break;

      default:
        console.warn('Unknown message type:', type);
    }
  } catch (error) {
    console.error('Worker error:', error);
    self.postMessage({
      type: 'INPAINTING_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};

export {}; 