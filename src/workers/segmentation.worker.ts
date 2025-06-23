/**
 * GPU-Accelerated Segmentation Worker
 * Uses TinySAM and other segmentation models for interactive object selection
 */

import { ModelManager, MODEL_CONFIGS } from '../utils/modelManager';
import { GPUDetector } from '../utils/gpuDetection';
import { getErrorMessage } from '../utils/errorHandler';

interface SegmentationMessage {
  type: 'INIT' | 'SEGMENT' | 'INTERACTIVE_SEGMENT' | 'GET_STATUS';
  data?: any;
  imageData?: ImageData;
  points?: Array<{ x: number; y: number; type: 'positive' | 'negative' }>;
  boxes?: Array<{ x: number; y: number; width: number; height: number }>;
}

class GPUSegmentationWorker {
  private modelManager: ModelManager;
  private gpuDetector: GPUDetector;
  private initialized = false;
  private imageEmbedding: any = null; // Cached embedding for current image

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

      console.log('🎯 Segmentation Worker initialized');
    } catch (error) {
      console.error('Failed to initialize segmentation worker:', error);
      self.postMessage({
        type: 'INIT_ERROR',
        error: getErrorMessage(error)
      });
    }
  }

  async performSegmentation(imageData: ImageData) {
    if (!this.initialized) {
      throw new Error('Worker not initialized');
    }

    try {
      self.postMessage({
        type: 'SEGMENTATION_STARTED'
      });

      // Load model
      await this.modelManager.loadModel('tinysam', (progress) => {
        self.postMessage({
          type: 'MODEL_LOADING_PROGRESS',
          progress,
          modelType: 'tinysam'
        });
      });

      self.postMessage({
        type: 'SEGMENTATION_PROGRESS',
        progress: 20
      });

      // Generate image embedding (this allows for fast interactive segmentation)
      this.imageEmbedding = await this.generateImageEmbedding(imageData);

      self.postMessage({
        type: 'SEGMENTATION_PROGRESS',
        progress: 80
      });

      // Generate initial segmentation of the entire image
      const segments = await this.generateInitialSegments(imageData);

      self.postMessage({
        type: 'SEGMENTATION_COMPLETE',
        data: {
          segments,
          canInteract: true // Indicates user can now click for interactive segmentation
        }
      });

    } catch (error) {
      console.error('Segmentation failed:', error);
      self.postMessage({
        type: 'SEGMENTATION_ERROR',
        error: getErrorMessage(error)
      });
    }
  }

  async performInteractiveSegmentation(
    imageData: ImageData,
    points: Array<{ x: number; y: number; type: 'positive' | 'negative' }> = [],
    boxes: Array<{ x: number; y: number; width: number; height: number }> = []
  ) {
    if (!this.initialized) {
      throw new Error('Worker not initialized');
    }

    try {
      self.postMessage({
        type: 'INTERACTIVE_SEGMENTATION_STARTED'
      });

      // Use cached embedding if available, otherwise generate new one
      if (!this.imageEmbedding) {
        this.imageEmbedding = await this.generateImageEmbedding(imageData);
      }

      self.postMessage({
        type: 'INTERACTIVE_SEGMENTATION_PROGRESS',
        progress: 30
      });

      // Process prompts (points and boxes)
      const promptEmbedding = await this.processPrompts(points, boxes, imageData.width, imageData.height);

      self.postMessage({
        type: 'INTERACTIVE_SEGMENTATION_PROGRESS',
        progress: 60
      });

      // Generate segmentation from prompts
      const mask = await this.generateSegmentationMask(this.imageEmbedding, promptEmbedding);

      self.postMessage({
        type: 'INTERACTIVE_SEGMENTATION_PROGRESS',
        progress: 90
      });

      // Convert mask to ImageData
      const segmentationResult = await this.maskToImageData(mask, imageData.width, imageData.height);

      self.postMessage({
        type: 'INTERACTIVE_SEGMENTATION_COMPLETE',
        data: {
          mask: segmentationResult,
          points,
          boxes
        }
      });

    } catch (error) {
      console.error('Interactive segmentation failed:', error);
      self.postMessage({
        type: 'INTERACTIVE_SEGMENTATION_ERROR',
        error: getErrorMessage(error)
      });
    }
  }

  private async generateImageEmbedding(imageData: ImageData): Promise<any> {
    // Preprocess image for TinySAM
    const preprocessed = await this.preprocessImageForSAM(imageData);
    
    // Generate embedding using image encoder
    const embedding = await this.modelManager.executeModel('tinysam-encoder', preprocessed);
    
    return embedding;
  }

  private async preprocessImageForSAM(imageData: ImageData): Promise<any> {
    // TinySAM expects 1024x1024 input
    const targetSize = 1024;
    
    // Create canvas and resize
    const canvas = new OffscreenCanvas(imageData.width, imageData.height);
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);

    // Resize while maintaining aspect ratio
    const resizedCanvas = new OffscreenCanvas(targetSize, targetSize);
    const resizedCtx = resizedCanvas.getContext('2d')!;
    
    // Calculate scaling to maintain aspect ratio
    const scale = Math.min(targetSize / imageData.width, targetSize / imageData.height);
    const scaledWidth = imageData.width * scale;
    const scaledHeight = imageData.height * scale;
    const offsetX = (targetSize - scaledWidth) / 2;
    const offsetY = (targetSize - scaledHeight) / 2;

    // Fill with mean ImageNet color
    resizedCtx.fillStyle = 'rgb(123, 116, 103)'; // ImageNet mean
    resizedCtx.fillRect(0, 0, targetSize, targetSize);
    
    // Draw scaled image
    resizedCtx.drawImage(canvas, offsetX, offsetY, scaledWidth, scaledHeight);

    // Convert to tensor
    const tensor = await this.canvasToTensor(resizedCanvas);
    
    return {
      tensor,
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
    
    const tensorData = new Float32Array(canvas.width * canvas.height * 3);
    const { data } = imageData;

    // ImageNet normalization for SAM
    const mean = [123.675, 116.28, 103.53];
    const std = [58.395, 57.12, 57.375];

    for (let i = 0; i < data.length; i += 4) {
      const pixelIndex = i / 4;
      
      const r = (data[i] - mean[0]) / std[0];
      const g = (data[i + 1] - mean[1]) / std[1];
      const b = (data[i + 2] - mean[2]) / std[2];

      tensorData[pixelIndex] = r;
      tensorData[pixelIndex + canvas.width * canvas.height] = g;
      tensorData[pixelIndex + 2 * canvas.width * canvas.height] = b;
    }

    return {
      data: tensorData,
      shape: [1, 3, canvas.height, canvas.width]
    };
  }

  private async generateInitialSegments(imageData: ImageData): Promise<any[]> {
    // Generate grid of points for automatic segmentation
    const gridSize = 32;
    const points = [];
    
    for (let y = gridSize; y < imageData.height; y += gridSize) {
      for (let x = gridSize; x < imageData.width; x += gridSize) {
        points.push({ x, y, type: 'positive' as const });
      }
    }

    // Process in batches to avoid overwhelming the model
    const batchSize = 16;
    const segments = [];
    
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      const batchSegments = await this.processBatchSegmentation(batch, imageData);
      segments.push(...batchSegments);
    }

    // Merge similar segments and filter small ones
    return this.filterAndMergeSegments(segments, imageData.width, imageData.height);
  }

  private async processBatchSegmentation(points: any[], imageData: ImageData): Promise<any[]> {
    const segments = [];
    
    for (const point of points) {
      try {
        const promptEmbedding = await this.processPrompts([point], [], imageData.width, imageData.height);
        const mask = await this.generateSegmentationMask(this.imageEmbedding, promptEmbedding);
        
        // Convert to segment
        const segment = await this.maskToSegment(mask, point, imageData.width, imageData.height);
        if (segment && segment.area > 100) { // Filter tiny segments
          segments.push(segment);
        }
      } catch (error) {
        console.warn('Failed to process point:', point, error);
      }
    }
    
    return segments;
  }

  private async processPrompts(
    points: Array<{ x: number; y: number; type: 'positive' | 'negative' }>,
    boxes: Array<{ x: number; y: number; width: number; height: number }>,
    _imageWidth: number,
    _imageHeight: number
  ): Promise<any> {
    // Convert prompts to model format
    const pointCoords = [];
    const pointLabels = [];
    
    // Add points
    for (const point of points) {
      pointCoords.push([point.x, point.y]);
      pointLabels.push(point.type === 'positive' ? 1 : 0);
    }
    
    // Add box corners as points
    for (const box of boxes) {
      // Top-left and bottom-right corners
      pointCoords.push([box.x, box.y]);
      pointLabels.push(2); // Box start
      pointCoords.push([box.x + box.width, box.y + box.height]);
      pointLabels.push(3); // Box end
    }
    
    // Convert to tensors
    const coordTensor = new Float32Array(pointCoords.flat());
    const labelTensor = new Float32Array(pointLabels);
    
    return {
      coords: {
        data: coordTensor,
        shape: [1, pointCoords.length, 2]
      },
      labels: {
        data: labelTensor,
        shape: [1, pointLabels.length]
      }
    };
  }

  private async generateSegmentationMask(imageEmbedding: any, promptEmbedding: any): Promise<any> {
    // Use prompt encoder + mask decoder
    const inputs = {
      image_embedding: imageEmbedding,
      point_coords: promptEmbedding.coords,
      point_labels: promptEmbedding.labels
    };
    
    // Execute mask decoder
    const result = await this.modelManager.executeModel('tinysam-decoder', inputs);
    
    return result;
  }

  private async maskToImageData(mask: any, width: number, height: number): Promise<ImageData> {
    let maskData: Float32Array;
    let maskWidth: number, maskHeight: number;

    if (mask.data) {
      maskData = mask.data;
      maskWidth = mask.shape[3] || mask.shape[2];
      maskHeight = mask.shape[2] || mask.shape[1];
    } else {
      maskData = mask;
      maskWidth = width;
      maskHeight = height;
    }

    // Create ImageData
    const canvas = new OffscreenCanvas(maskWidth, maskHeight);
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(maskWidth, maskHeight);

    // Convert mask to RGBA
    for (let i = 0; i < maskWidth * maskHeight; i++) {
      const value = maskData[i] > 0.5 ? 255 : 0; // Threshold at 0.5
      
      imageData.data[i * 4] = value;     // R
      imageData.data[i * 4 + 1] = value; // G
      imageData.data[i * 4 + 2] = value; // B
      imageData.data[i * 4 + 3] = 255;   // A
    }

    // Resize to target dimensions if needed
    if (maskWidth !== width || maskHeight !== height) {
      ctx.putImageData(imageData, 0, 0);
      
      const finalCanvas = new OffscreenCanvas(width, height);
      const finalCtx = finalCanvas.getContext('2d')!;
      finalCtx.drawImage(canvas, 0, 0, width, height);
      
      return finalCtx.getImageData(0, 0, width, height);
    }

    return imageData;
  }

  private async maskToSegment(mask: any, sourcePoint: any, width: number, height: number): Promise<any> {
    const maskImageData = await this.maskToImageData(mask, width, height);
    
    // Calculate segment properties
    let area = 0;
    let minX = width, minY = height, maxX = 0, maxY = 0;
    
    const data = maskImageData.data;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 128) { // Mask pixel
        area++;
        const pixelIndex = i / 4;
        const x = pixelIndex % width;
        const y = Math.floor(pixelIndex / width);
        
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
    
    if (area === 0) return null;
    
    return {
      mask: maskImageData,
      area,
      bbox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
      sourcePoint,
      confidence: area / ((maxX - minX) * (maxY - minY)) // Rough confidence based on bbox fill
    };
  }

  private filterAndMergeSegments(segments: any[], width: number, height: number): any[] {
    // Sort by area (largest first)
    segments.sort((a, b) => b.area - a.area);
    
    // Filter overlapping segments
    const filtered = [];
    for (const segment of segments) {
      let hasOverlap = false;
      
      for (const existing of filtered) {
        const overlap = this.calculateSegmentOverlap(segment, existing);
        if (overlap > 0.7) { // High overlap threshold
          hasOverlap = true;
          break;
        }
      }
      
      if (!hasOverlap && segment.area > width * height * 0.001) { // Min 0.1% of image
        filtered.push(segment);
      }
    }
    
    return filtered.slice(0, 50); // Max 50 segments
  }

  private calculateSegmentOverlap(seg1: any, seg2: any): number {
    const box1 = seg1.bbox;
    const box2 = seg2.bbox;
    
    const x1 = Math.max(box1.x, box2.x);
    const y1 = Math.max(box1.y, box2.y);
    const x2 = Math.min(box1.x + box1.width, box2.x + box2.width);
    const y2 = Math.min(box1.y + box1.height, box2.y + box2.height);
    
    if (x2 <= x1 || y2 <= y1) return 0;
    
    const overlapArea = (x2 - x1) * (y2 - y1);
    const union = seg1.area + seg2.area - overlapArea;
    
    return overlapArea / union;
  }

  getStatus() {
    const gpuInfo = this.gpuDetector.getGPUInfo();
    const loadedModels = this.modelManager.getLoadedModels();
    
    return {
      initialized: this.initialized,
      backend: this.modelManager.getBackend(),
      gpuInfo,
      loadedModels,
      hasImageEmbedding: !!this.imageEmbedding,
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
  const { type, imageData, points, boxes } = event.data;

  try {
    switch (type) {
      case 'INIT':
        await worker.initialize();
        break;

      case 'SEGMENT':
        if (imageData) {
          await worker.performSegmentation(imageData);
        }
        break;

      case 'INTERACTIVE_SEGMENT':
        if (imageData) {
          await worker.performInteractiveSegmentation(imageData, points, boxes);
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
      error: getErrorMessage(error)
    });
  }
}; 