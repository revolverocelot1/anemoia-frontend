/**
 * GPU-Accelerated Segmentation Worker
 * Uses TinySAM for interactive object selection and segmentation
 */

import { ModelManager, MODEL_CONFIGS } from '../utils/modelManager';
import { GPUDetector } from '../utils/gpuDetection';

interface Point {
  x: number;
  y: number;
  label: 1 | 0; // 1 for positive, 0 for negative
}

interface SegmentationMessage {
  type: 'INIT' | 'SEGMENT' | 'SET_IMAGE' | 'GET_STATUS';
  data?: any;
  imageData?: ImageData;
  points?: Point[];
  options?: {
    multiMask?: boolean;
    returnLogits?: boolean;
    threshold?: number;
  };
}

class GPUSegmentationWorker {
  private modelManager: ModelManager;
  private gpuDetector: GPUDetector;
  private initialized = false;
  private currentImage: ImageData | null = null;
  private imageEmbedding: any = null;

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

      this.initialized = true;

      self.postMessage({
        type: 'INIT_COMPLETE',
        data: {
          gpuInfo,
          backend: this.modelManager.getBackend(),
          availableModels: ['tinysam']
        }
      });

      console.log('🎯 Segmentation Worker initialized with TinySAM');
    } catch (error) {
      console.error('Failed to initialize segmentation worker:', error);
      self.postMessage({
        type: 'INIT_ERROR',
        error: error.message
      });
    }
  }

  async setImage(imageData: ImageData) {
    if (!this.initialized) {
      throw new Error('Worker not initialized');
    }

    try {
      self.postMessage({
        type: 'EMBEDDING_STARTED'
      });

      // Load TinySAM model if not already loaded
      const model = await this.modelManager.loadModel('tinysam', (progress) => {
        self.postMessage({
          type: 'MODEL_LOADING_PROGRESS',
          progress,
          modelType: 'tinysam'
        });
      });

      self.postMessage({
        type: 'EMBEDDING_PROGRESS',
        progress: 30
      });

      // Preprocess image for TinySAM
      const preprocessedImage = await this.preprocessImage(imageData);

      self.postMessage({
        type: 'EMBEDDING_PROGRESS',
        progress: 60
      });

      // Generate image embedding
      this.imageEmbedding = await this.generateImageEmbedding(preprocessedImage);
      this.currentImage = imageData;

      self.postMessage({
        type: 'EMBEDDING_COMPLETE',
        imageWidth: imageData.width,
        imageHeight: imageData.height
      });

      console.log('📸 Image embedding generated');
    } catch (error) {
      console.error('Failed to set image:', error);
      self.postMessage({
        type: 'EMBEDDING_ERROR',
        error: error.message
      });
    }
  }

  async segment(points: Point[], options: any = {}) {
    if (!this.initialized || !this.imageEmbedding || !this.currentImage) {
      throw new Error('Worker not initialized or no image set');
    }

    try {
      const multiMask = options.multiMask || false;
      const returnLogits = options.returnLogits || false;
      const threshold = options.threshold || 0.0;

      self.postMessage({
        type: 'SEGMENTATION_STARTED',
        pointCount: points.length
      });

      // Preprocess points for the model
      const processedPoints = await this.preprocessPoints(points, this.currentImage);

      self.postMessage({
        type: 'SEGMENTATION_PROGRESS',
        progress: 30
      });

      // Run mask decoder with points and image embedding
      const masks = await this.decodeMasks(processedPoints, this.imageEmbedding, multiMask);

      self.postMessage({
        type: 'SEGMENTATION_PROGRESS',
        progress: 70
      });

      // Post-process masks
      const finalMasks = await this.postprocessMasks(
        masks, 
        this.currentImage.width, 
        this.currentImage.height,
        threshold,
        returnLogits
      );

      self.postMessage({
        type: 'SEGMENTATION_COMPLETE',
        data: finalMasks,
        pointCount: points.length
      });

    } catch (error) {
      console.error('Segmentation failed:', error);
      self.postMessage({
        type: 'SEGMENTATION_ERROR',
        error: error.message
      });
    }
  }

  private async preprocessImage(imageData: ImageData): Promise<any> {
    // TinySAM expects 1024x1024 input
    const targetSize = 1024;
    
    // Create canvas and resize image while maintaining aspect ratio
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    // Calculate scaling and padding
    const scale = targetSize / Math.max(imageData.width, imageData.height);
    const scaledWidth = Math.round(imageData.width * scale);
    const scaledHeight = Math.round(imageData.height * scale);
    const padX = (targetSize - scaledWidth) / 2;
    const padY = (targetSize - scaledHeight) / 2;

    // Create padded canvas
    const paddedCanvas = new OffscreenCanvas(targetSize, targetSize);
    const paddedCtx = paddedCanvas.getContext('2d')!;
    
    // Fill with mean color for padding
    paddedCtx.fillStyle = '#808080';
    paddedCtx.fillRect(0, 0, targetSize, targetSize);
    
    // Draw scaled image
    paddedCtx.drawImage(canvas, padX, padY, scaledWidth, scaledHeight);

    // Convert to tensor
    const tensor = await this.canvasToTensor(paddedCanvas);

    return {
      tensor,
      scale,
      padX,
      padY,
      originalWidth: imageData.width,
      originalHeight: imageData.height
    };
  }

  private async canvasToTensor(canvas: OffscreenCanvas): Promise<any> {
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    // Convert to tensor format for TinySAM
    const tensorData = new Float32Array(canvas.width * canvas.height * 3);
    const { data } = imageData;

    // ImageNet normalization
    const mean = [0.485, 0.456, 0.406];
    const std = [0.229, 0.224, 0.225];

    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      
      const r = data[i] / 255.0;
      const g = data[i + 1] / 255.0;
      const b = data[i + 2] / 255.0;

      // Apply normalization
      tensorData[pixelIndex] = (r - mean[0]) / std[0];
      tensorData[pixelIndex + canvas.width * canvas.height] = (g - mean[1]) / std[1];
      tensorData[pixelIndex + 2 * canvas.width * canvas.height] = (b - mean[2]) / std[2];
    }

    return {
      data: tensorData,
      shape: [1, 3, canvas.height, canvas.width]
    };
  }

  private async generateImageEmbedding(preprocessedImage: any): Promise<any> {
    // Use the image encoder part of TinySAM
    const result = await this.modelManager.executeModel('tinysam', preprocessedImage.tensor, {
      task: 'encode_image'
    });

    return {
      embedding: result,
      preprocessInfo: preprocessedImage
    };
  }

  private async preprocessPoints(points: Point[], imageData: ImageData): Promise<any> {
    if (!this.imageEmbedding || !this.imageEmbedding.preprocessInfo) {
      throw new Error('No image embedding available');
    }

    const { scale, padX, padY } = this.imageEmbedding.preprocessInfo;
    
    // Transform points to model coordinates
    const transformedPoints = points.map(point => ({
      x: point.x * scale + padX,
      y: point.y * scale + padY,
      label: point.label
    }));

    // Convert to tensor format
    const pointCoords = new Float32Array(transformedPoints.length * 2);
    const pointLabels = new Float32Array(transformedPoints.length);

    for (let i = 0; i < transformedPoints.length; i++) {
      pointCoords[i * 2] = transformedPoints[i].x;
      pointCoords[i * 2 + 1] = transformedPoints[i].y;
      pointLabels[i] = transformedPoints[i].label;
    }

    return {
      coords: {
        data: pointCoords,
        shape: [1, transformedPoints.length, 2]
      },
      labels: {
        data: pointLabels,
        shape: [1, transformedPoints.length]
      }
    };
  }

  private async decodeMasks(points: any, imageEmbedding: any, multiMask: boolean): Promise<any> {
    // Use the mask decoder part of TinySAM
    const result = await this.modelManager.executeModel('tinysam', {
      image_embedding: imageEmbedding.embedding,
      point_coords: points.coords,
      point_labels: points.labels
    }, {
      task: 'decode_masks',
      multiMask
    });

    return result;
  }

  private async postprocessMasks(
    rawMasks: any, 
    originalWidth: number, 
    originalHeight: number,
    threshold: number,
    returnLogits: boolean
  ): Promise<any[]> {
    const preprocessInfo = this.imageEmbedding.preprocessInfo;
    
    let masksData: Float32Array;
    let numMasks: number;
    let maskHeight: number, maskWidth: number;

    if (rawMasks.masks) {
      masksData = rawMasks.masks.data;
      const shape = rawMasks.masks.shape;
      numMasks = shape[1];
      maskHeight = shape[2];
      maskWidth = shape[3];
    } else {
      masksData = rawMasks.data;
      const shape = rawMasks.shape;
      numMasks = shape[0] || 1;
      maskHeight = shape[1] || shape[2];
      maskWidth = shape[2] || shape[3];
    }

    const processedMasks = [];

    for (let maskIdx = 0; maskIdx < numMasks; maskIdx++) {
      // Extract single mask
      const maskSize = maskHeight * maskWidth;
      const singleMaskData = masksData.slice(maskIdx * maskSize, (maskIdx + 1) * maskSize);

      // Convert to ImageData
      const maskCanvas = new OffscreenCanvas(maskWidth, maskHeight);
      const maskCtx = maskCanvas.getContext('2d')!;
      const maskImageData = maskCtx.createImageData(maskWidth, maskHeight);

      for (let i = 0; i < maskSize; i++) {
        let value = singleMaskData[i];
        
        if (!returnLogits) {
          // Apply sigmoid and threshold
          value = 1 / (1 + Math.exp(-value));
          value = value > threshold ? 1 : 0;
        }

        const grayValue = returnLogits ? 
          Math.round((value + 5) * 25.5) : // Map logits to 0-255
          Math.round(value * 255);

        maskImageData.data[i * 4] = grayValue;     // R
        maskImageData.data[i * 4 + 1] = grayValue; // G
        maskImageData.data[i * 4 + 2] = grayValue; // B
        maskImageData.data[i * 4 + 3] = 255;       // A
      }

      maskCtx.putImageData(maskImageData, 0, 0);

      // Resize back to original image size
      const finalCanvas = new OffscreenCanvas(originalWidth, originalHeight);
      const finalCtx = finalCanvas.getContext('2d')!;

      // Account for padding and scaling
      const { scale, padX, padY } = preprocessInfo;
      const scaledWidth = originalWidth * scale;
      const scaledHeight = originalHeight * scale;

      finalCtx.drawImage(
        maskCanvas,
        padX, padY, scaledWidth, scaledHeight,
        0, 0, originalWidth, originalHeight
      );

      const finalMask = finalCtx.getImageData(0, 0, originalWidth, originalHeight);

      processedMasks.push({
        mask: finalMask,
        score: rawMasks.scores ? rawMasks.scores.data[maskIdx] : 1.0,
        stability: rawMasks.stability ? rawMasks.stability.data[maskIdx] : 1.0
      });
    }

    return processedMasks;
  }

  async generateAutomaticMasks(imageData: ImageData, options: any = {}): Promise<any> {
    // Generate automatic masks for the entire image (SAM's "everything" mode)
    if (!this.initialized) {
      throw new Error('Worker not initialized');
    }

    try {
      self.postMessage({
        type: 'AUTO_SEGMENTATION_STARTED'
      });

      // Set image if different
      if (!this.currentImage || !this.arraysEqual(imageData.data, this.currentImage.data)) {
        await this.setImage(imageData);
      }

      // Generate a grid of points for automatic segmentation
      const gridSize = options.gridSize || 32;
      const points = this.generatePointGrid(imageData.width, imageData.height, gridSize);

      const allMasks = [];
      const batchSize = 10; // Process points in batches

      for (let i = 0; i < points.length; i += batchSize) {
        const batch = points.slice(i, i + batchSize);
        
        self.postMessage({
          type: 'AUTO_SEGMENTATION_PROGRESS',
          progress: (i / points.length) * 100,
          processedPoints: i,
          totalPoints: points.length
        });

        const batchMasks = await this.segment(batch, { multiMask: true });
        allMasks.push(...batchMasks);
      }

      // Filter and merge overlapping masks
      const filteredMasks = this.filterMasks(allMasks, options);

      self.postMessage({
        type: 'AUTO_SEGMENTATION_COMPLETE',
        data: filteredMasks,
        totalMasks: filteredMasks.length
      });

      return filteredMasks;
    } catch (error) {
      console.error('Automatic segmentation failed:', error);
      self.postMessage({
        type: 'AUTO_SEGMENTATION_ERROR',
        error: error.message
      });
    }
  }

  private generatePointGrid(width: number, height: number, gridSize: number): Point[] {
    const points: Point[] = [];
    const stepX = width / gridSize;
    const stepY = height / gridSize;

    for (let y = stepY / 2; y < height; y += stepY) {
      for (let x = stepX / 2; x < width; x += stepX) {
        points.push({
          x: Math.round(x),
          y: Math.round(y),
          label: 1
        });
      }
    }

    return points;
  }

  private filterMasks(masks: any[], options: any): any[] {
    // Remove low-quality masks
    const minScore = options.minScore || 0.7;
    const minStability = options.minStability || 0.8;
    
    let filtered = masks.filter(mask => 
      mask.score >= minScore && mask.stability >= minStability
    );

    // Remove highly overlapping masks
    filtered = this.removeOverlappingMasks(filtered, options.maxOverlap || 0.8);

    // Sort by score
    filtered.sort((a, b) => b.score - a.score);

    // Limit number of masks
    const maxMasks = options.maxMasks || 100;
    return filtered.slice(0, maxMasks);
  }

  private removeOverlappingMasks(masks: any[], maxOverlap: number): any[] {
    const filtered = [];
    
    for (const mask of masks) {
      let shouldAdd = true;
      
      for (const existingMask of filtered) {
        const overlap = this.calculateMaskOverlap(mask.mask, existingMask.mask);
        if (overlap > maxOverlap) {
          shouldAdd = false;
          break;
        }
      }
      
      if (shouldAdd) {
        filtered.push(mask);
      }
    }
    
    return filtered;
  }

  private calculateMaskOverlap(mask1: ImageData, mask2: ImageData): number {
    if (mask1.width !== mask2.width || mask1.height !== mask2.height) {
      return 0;
    }

    let intersection = 0;
    let union = 0;

    for (let i = 0; i < mask1.data.length; i += 4) {
      const val1 = mask1.data[i] > 128 ? 1 : 0;
      const val2 = mask2.data[i] > 128 ? 1 : 0;
      
      intersection += val1 & val2;
      union += val1 | val2;
    }

    return union > 0 ? intersection / union : 0;
  }

  private arraysEqual(a: Uint8ClampedArray, b: Uint8ClampedArray): boolean {
    if (a.length !== b.length) return false;
    
    // Sample comparison for performance (check every 1000th pixel)
    for (let i = 0; i < a.length; i += 4000) {
      if (a[i] !== b[i]) return false;
    }
    
    return true;
  }

  getStatus() {
    const gpuInfo = this.gpuDetector.getGPUInfo();
    const loadedModels = this.modelManager.getLoadedModels();
    
    return {
      initialized: this.initialized,
      hasImage: !!this.currentImage,
      hasEmbedding: !!this.imageEmbedding,
      backend: this.modelManager.getBackend(),
      gpuInfo,
      loadedModels,
      availableModels: Object.keys(MODEL_CONFIGS).filter(key => 
        MODEL_CONFIGS[key].type === 'segmentation'
      )
    };
  }
}

// Worker instance
const worker = new GPUSegmentationWorker();

// Message handler
self.onmessage = async (event: MessageEvent<SegmentationMessage>) => {
  const { type, data, imageData, points, options } = event.data;

  try {
    switch (type) {
      case 'INIT':
        await worker.initialize();
        break;

      case 'SET_IMAGE':
        if (imageData) {
          await worker.setImage(imageData);
        }
        break;

      case 'SEGMENT':
        if (points) {
          await worker.segment(points, options);
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
    console.error('Segmentation worker error:', error);
    self.postMessage({
      type: 'ERROR',
      error: error.message
    });
  }
}; 