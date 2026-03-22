/**
 * SHARP Service - Backend-agnostic Gaussian Splat generation
 * 
 * Supports multiple generation modes:
 * - "remote": HTTP API to GPU inference service
 * - "demo": Uses Depth Anything V2 neural network for on-device 3D generation
 * - "local-webgpu": Future WebGPU inference (research)
 * 
 * The demo mode now uses actual neural depth estimation (Depth Anything V2)
 * via a dedicated web worker, producing much better 3D results than heuristics.
 */

import { sharpFileStore, type StoredFile } from '../utils/sharpFileStore';
import { computeIntrinsicFov } from '../utils/splatLens';

// Service configuration
const SHARP_API_URL = import.meta.env.VITE_SHARP_API_URL || 'http://localhost:8000';

export type GenerationMode = 'remote' | 'demo' | 'local-webgpu';

// Worker response types
interface SharpWorkerResponse {
  status: 'loading_model' | 'model_ready' | 'processing' | 'complete' | 'error' | 'preload_complete';
  progress?: number;
  message?: string;
  error?: string;
  plyBuffer?: ArrayBuffer;
  metadata?: {
    gaussianCount: number;
    depthWidth: number;
    depthHeight: number;
    minDepth: number;
    maxDepth: number;
    boundsMin: [number, number, number];
    boundsMax: [number, number, number];
    center: [number, number, number];
    focusDepth: number;
    cameraSpace: boolean;
    frontBeta: number;
    parallaxBeta: number;
  };
}

export interface GenerationOptions {
  mode?: GenerationMode;
  focalLengthPx?: number;
  focalLengthMm?: number;
  horizontalFovDeg?: number;
  gridSize?: number; // Controls splat count (gridSize²), default 512
  useBaseModel?: boolean;
  onProgress?: (progress: number, message: string) => void;
}

export interface GenerationResult {
  success: boolean;
  fileId?: string;
  filename?: string;
  blob?: Blob;
  metadata?: {
    defaultFov?: number;
    gaussianCount?: number;
    focalLength?: number;
    width?: number;
    height?: number;
    originalFov?: number;
    viewerCalibration?: {
      boundsMin?: [number, number, number];
      boundsMax?: [number, number, number];
      center?: [number, number, number];
      focusDepth?: number;
      cameraSpace?: boolean;
      frontBeta?: number;
      parallaxBeta?: number;
    };
    processingTimeMs?: number;
    fileSize?: number;
  };
  error?: string;
}

export interface ServiceHealth {
  status: 'ok' | 'error' | 'unavailable';
  modelLoaded: boolean;
  device: string;
  version?: string;
}

/**
 * Compute focal length in pixels from FOV and image width
 */
export function fovToFocalLength(fovDegrees: number, imageWidth: number): number {
  const fovRadians = (fovDegrees * Math.PI) / 180;
  return (0.5 * imageWidth) / Math.tan(fovRadians / 2);
}

/**
 * Compute focal length in pixels from mm (35mm equivalent)
 */
export function mmToFocalLength(focalMm: number, imageWidth: number, imageHeight: number): number {
  const diagonal = Math.sqrt(imageWidth * imageWidth + imageHeight * imageHeight);
  const filmDiagonal = Math.sqrt(36 * 36 + 24 * 24); // 35mm film diagonal
  return focalMm * (diagonal / filmDiagonal);
}

/**
 * Extract EXIF focal length from image (browser-compatible)
 */
export async function extractExifFocalLength(file: File): Promise<number | null> {
  try {
    // Try to use EXIF.js if available, otherwise return null
    const EXIF = (window as any).EXIF;
    if (!EXIF) {
      console.log('[SharpService] EXIF library not loaded, skipping focal length extraction');
      return null;
    }

    return new Promise((resolve) => {
      EXIF.getData(file, function (this: any) {
        const focalLength35mm = EXIF.getTag(this, 'FocalLengthIn35mmFilm') ||
                                EXIF.getTag(this, 'FocalLenIn35mmFilm');
        const focalLength = EXIF.getTag(this, 'FocalLength');
        
        if (focalLength35mm && typeof focalLength35mm === 'number') {
          resolve(focalLength35mm);
        } else if (focalLength && typeof focalLength === 'number') {
          // If < 10mm, assume it's not 35mm equivalent and apply crude factor
          resolve(focalLength < 10 ? focalLength * 8.4 : focalLength);
        } else {
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.warn('[SharpService] EXIF extraction failed:', error);
    return null;
  }
}

/**
 * Get image dimensions from a file
 */
export async function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };
    
    img.src = url;
  });
}

class SharpService {
  private mode: GenerationMode = 'demo';
  private apiUrl: string = SHARP_API_URL;
  private worker: Worker | null = null;
  private workerPromise: Promise<Worker> | null = null;

  setMode(mode: GenerationMode): void {
    this.mode = mode;
    console.log(`[SharpService] Mode set to: ${mode}`);
  }

  setApiUrl(url: string): void {
    this.apiUrl = url;
  }

  /**
   * Get or create the SHARP depth worker
   * Uses Depth Anything V2 for neural depth estimation
   */
  private async getWorker(): Promise<Worker> {
    if (this.worker) return this.worker;
    
    if (this.workerPromise) return this.workerPromise;
    
    this.workerPromise = new Promise<Worker>((resolve, reject) => {
      try {
        const worker = new Worker(
          new URL('../workers/sharp-depth.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        // Wait for worker to be ready
        const initHandler = (e: MessageEvent<SharpWorkerResponse>) => {
          if (e.data.status === 'error') {
            worker.removeEventListener('message', initHandler);
            reject(new Error(e.data.error || 'Worker initialization failed'));
          }
        };
        
        worker.addEventListener('message', initHandler);
        worker.onerror = (err) => {
          reject(new Error(`Worker error: ${err.message}`));
        };
        
        this.worker = worker;
        resolve(worker);
      } catch (error) {
        reject(error);
      }
    });
    
    return this.workerPromise;
  }

  /**
   * Preload the neural depth model (call this early for better UX)
   */
  async preloadModel(useBaseModel: boolean = false): Promise<void> {
    try {
      const worker = await this.getWorker();
      
      return new Promise((resolve, reject) => {
        const handler = (e: MessageEvent<SharpWorkerResponse>) => {
          if (e.data.status === 'preload_complete' || e.data.status === 'model_ready') {
            worker.removeEventListener('message', handler);
            resolve();
          } else if (e.data.status === 'error') {
            worker.removeEventListener('message', handler);
            reject(new Error(e.data.error));
          }
        };
        
        worker.addEventListener('message', handler);
        worker.postMessage({ command: 'preload', useBaseModel });
      });
    } catch (error) {
      console.warn('[SharpService] Model preload failed:', error);
    }
  }

  /**
   * Terminate the worker (cleanup)
   */
  terminateWorker(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      this.workerPromise = null;
    }
  }

  /**
   * Check if the remote service is healthy
   */
  async checkHealth(): Promise<ServiceHealth> {
    if (this.mode === 'demo') {
      return {
        status: 'ok',
        modelLoaded: true,
        device: 'demo',
        version: '1.0.0-demo'
      };
    }

    try {
      const response = await fetch(`${this.apiUrl}/api/sharp/health`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' }
      });

      if (!response.ok) {
        return { status: 'error', modelLoaded: false, device: 'unknown' };
      }

      const data = await response.json();
      return {
        status: 'ok',
        modelLoaded: data.model_loaded ?? true,
        device: data.device ?? 'unknown',
        version: data.version
      };
    } catch (error) {
      console.error('[SharpService] Health check failed:', error);
      return { status: 'unavailable', modelLoaded: false, device: 'unavailable' };
    }
  }

  /**
   * Generate 3D Gaussian Splats from an image
   */
  async generate(
    imageFile: File,
    options: GenerationOptions = {}
  ): Promise<GenerationResult> {
    const mode = options.mode ?? this.mode;
    const onProgress = options.onProgress ?? (() => {});
    const gridSize = options.gridSize ?? 512; // Default to medium quality

    console.log(`[SharpService] Generating with mode: ${mode}, gridSize: ${gridSize}`);
    onProgress(0, 'Starting generation...');

    try {
      // Get image dimensions for focal length calculations
      const dimensions = await getImageDimensions(imageFile);
      onProgress(5, 'Analyzing image...');

      // Calculate focal length
      let focalLengthPx: number;
      
      if (options.focalLengthPx) {
        focalLengthPx = options.focalLengthPx;
      } else if (options.horizontalFovDeg) {
        focalLengthPx = fovToFocalLength(options.horizontalFovDeg, dimensions.width);
      } else if (options.focalLengthMm) {
        focalLengthPx = mmToFocalLength(options.focalLengthMm, dimensions.width, dimensions.height);
      } else {
        // Try EXIF, fallback to default 30mm
        const exifMm = await extractExifFocalLength(imageFile);
        const mm = exifMm ?? 30;
        focalLengthPx = mmToFocalLength(mm, dimensions.width, dimensions.height);
      }

      const originalFov = (2 * Math.atan(dimensions.width / (2 * focalLengthPx)) * 180) / Math.PI;
      onProgress(10, 'Focal length calculated');

      let result: GenerationResult;

      switch (mode) {
        case 'remote':
          result = await this.generateRemote(imageFile, focalLengthPx, originalFov, dimensions, onProgress);
          break;
        case 'demo':
          result = await this.generateDemo(imageFile, focalLengthPx, originalFov, dimensions, gridSize, options.useBaseModel ?? false, onProgress);
          break;
        case 'local-webgpu':
          result = { success: false, error: 'WebGPU inference not yet implemented' };
          break;
        default:
          result = { success: false, error: `Unknown mode: ${mode}` };
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[SharpService] Generation failed:', error);
      return { success: false, error: message };
    }
  }

  /**
   * Remote GPU inference via HTTP API
   */
  private async generateRemote(
    imageFile: File,
    focalLengthPx: number,
    originalFov: number,
    dimensions: { width: number; height: number },
    onProgress: (progress: number, message: string) => void
  ): Promise<GenerationResult> {
    onProgress(15, 'Uploading image to server...');

    const formData = new FormData();
    formData.append('image', imageFile);
    formData.append('focal_length_px', focalLengthPx.toString());

    try {
      const response = await fetch(`${this.apiUrl}/api/sharp/predict`, {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error: ${response.status} - ${errorText}`);
      }

      onProgress(80, 'Processing response...');

      // Get processing metadata from headers if available
      const gaussianCount = parseInt(response.headers.get('X-Gaussian-Count') || '0', 10) || undefined;
      const processingTimeMs = parseInt(response.headers.get('X-Processing-Time-Ms') || '0', 10) || undefined;
      
      // Get the PLY blob
      const blob = await response.blob();
      
      // Store in IndexedDB
      const fileId = sharpFileStore.generateId();
      const filename = imageFile.name.replace(/\.[^/.]+$/, '') + '.ply';
      
      const storedFile: StoredFile = {
        id: fileId,
        filename,
        blob,
        size: blob.size,
        createdAt: new Date(),
        metadata: {
          defaultFov: computeIntrinsicFov({
            focalLength: focalLengthPx,
            width: dimensions.width,
            height: dimensions.height,
            originalFov,
          }, dimensions.width, dimensions.height, 60),
          gaussianCount,
          focalLength: focalLengthPx,
          width: dimensions.width,
          height: dimensions.height,
          originalFov,
          processingTimeMs
        }
      };

      await sharpFileStore.store(storedFile);
      onProgress(100, 'Complete!');

      return {
        success: true,
        fileId,
        filename,
        blob,
        metadata: storedFile.metadata
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Demo mode - uses Depth Anything V2 neural network for real depth estimation
   * Produces high-quality 3D Gaussian Splats with proper depth understanding
   * 
   * This runs entirely on the user's device using WASM (no server needed)
   */
  private async generateDemo(
    imageFile: File,
    focalLengthPx: number,
    originalFov: number,
    dimensions: { width: number; height: number },
    gridSize: number,
    useBaseModel: boolean,
    onProgress: (progress: number, message: string) => void
  ): Promise<GenerationResult> {
    const startTime = performance.now();
    
    onProgress(5, 'Initializing neural depth engine...');
    
    // Get or create the worker
    const worker = await this.getWorker();
    
    // Load image data for the worker - use higher resolution for better quality
    onProgress(8, 'Preparing image...');
    // Scale max image size based on grid size for better color sampling at high quality
    // 2M/3M experimental modes need 2K+ resolution for proper detail extraction
    let maxImageSize = 1024;
    if (gridSize >= 1414) {
      maxImageSize = 2560; // 3M splats - use maximum resolution for 2K+ source images
    } else if (gridSize >= 1024) {
      maxImageSize = 2048; // Ultra/2M - use 2K resolution
    } else if (gridSize >= 768) {
      maxImageSize = 1536; // High quality
    }
    const imageData = await this.loadImageData(imageFile, maxImageSize);
    
    return new Promise<GenerationResult>((resolve, reject) => {
      const handleMessage = async (e: MessageEvent<SharpWorkerResponse>) => {
        const { status, progress, message, error, plyBuffer, metadata } = e.data;
        
        if (status === 'loading_model') {
          onProgress(progress || 10, message || 'Loading neural network...');
        } else if (status === 'model_ready') {
          onProgress(progress || 15, message || 'Neural network ready');
        } else if (status === 'processing') {
          onProgress(progress || 50, message || 'Processing...');
        } else if (status === 'complete') {
          worker.removeEventListener('message', handleMessage);
          
          if (!plyBuffer) {
            reject(new Error('No PLY data received from worker'));
            return;
          }
          
          const processingTimeMs = performance.now() - startTime;
          
          onProgress(95, 'Storing result...');
          
          const blob = new Blob([plyBuffer], { type: 'application/octet-stream' });
          const fileId = sharpFileStore.generateId();
          const filename = imageFile.name.replace(/\.[^/.]+$/, '') + '_3d.ply';
          
          const storedFile: StoredFile = {
            id: fileId,
            filename,
            blob,
            size: blob.size,
            createdAt: new Date(),
            metadata: {
              defaultFov: computeIntrinsicFov({
                focalLength: focalLengthPx,
                width: dimensions.width,
                height: dimensions.height,
                originalFov,
                viewerCalibration: metadata ? {
                  boundsMin: metadata.boundsMin,
                  boundsMax: metadata.boundsMax,
                  center: metadata.center,
                  focusDepth: metadata.focusDepth,
                  cameraSpace: metadata.cameraSpace,
                  frontBeta: metadata.frontBeta,
                  parallaxBeta: metadata.parallaxBeta,
                } : undefined,
              }, dimensions.width, dimensions.height, 60),
              gaussianCount: metadata?.gaussianCount || gridSize * gridSize,
              focalLength: focalLengthPx,
              width: dimensions.width,
              height: dimensions.height,
              originalFov,
              viewerCalibration: metadata ? {
                boundsMin: metadata.boundsMin,
                boundsMax: metadata.boundsMax,
                center: metadata.center,
                focusDepth: metadata.focusDepth,
                cameraSpace: metadata.cameraSpace,
                frontBeta: metadata.frontBeta,
                parallaxBeta: metadata.parallaxBeta,
              } : undefined,
              processingTimeMs: Math.round(processingTimeMs),
              fileSize: blob.size
            }
          };

          await sharpFileStore.store(storedFile);
          onProgress(100, 'Generation complete!');

          resolve({
            success: true,
            fileId,
            filename,
            blob,
            metadata: storedFile.metadata
          });
          
        } else if (status === 'error') {
          worker.removeEventListener('message', handleMessage);
          reject(new Error(error || 'Neural depth estimation failed'));
        }
      };
      
      worker.addEventListener('message', handleMessage);
      
      // Start generation
      console.log(`[SharpService] Sending to worker: gridSize=${gridSize}, expected splats=${gridSize * gridSize}`);
      worker.postMessage({
        command: 'generate',
        imageData: {
          data: imageData.data,
          width: imageData.width,
          height: imageData.height,
        },
        gridSize,
        depthScale: 1.5,
        focalLengthPx,
        useBaseModel,
      });
    });
  }

  /**
   * Load image file into canvas and get pixel data
   * @param file - Image file to load
   * @param maxSize - Maximum dimension (width or height) for processing
   */
  private async loadImageData(file: File, maxSize: number = 768): Promise<ImageData> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const url = URL.createObjectURL(file);
      
      img.onload = () => {
        URL.revokeObjectURL(url);
        
        // Resize to target size while maintaining aspect ratio
        let width = img.naturalWidth;
        let height = img.naturalHeight;
        
        if (width > maxSize || height > maxSize) {
          const scale = maxSize / Math.max(width, height);
          width = Math.round(width * scale);
          height = Math.round(height * scale);
        }
        
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d')!;
        // Use high-quality image smoothing for better sampling
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);
        
        resolve(ctx.getImageData(0, 0, width, height));
      };
      
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Failed to load image'));
      };
      
      img.src = url;
    });
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Export singleton instance
export const sharpService = new SharpService();

// Export the class for custom instances
export { SharpService };



