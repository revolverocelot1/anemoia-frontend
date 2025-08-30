import * as ort from 'onnxruntime-web';
import Delaunator from 'delaunator';

// Configure ONNX Runtime Web
ort.env.wasm.wasmPaths = '/ort-wasm/';
ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
ort.env.wasm.simd = true;
// Disable proxy to use direct WASM execution
ort.env.wasm.proxy = false;

export interface FaceSwapConfig {
  modelQuality: 'low' | 'medium' | 'high';
  enableEnhancement: boolean;
  blendingMode: 'poisson' | 'linear' | 'feather';
  preserveExpression: boolean;
  useWebGL: boolean;
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
  confidence: number;
}

export interface FaceLandmarks {
  points: Float32Array;
  confidence: number;
}

export interface FaceData {
  boundingBox: BoundingBox;
  landmarks: FaceLandmarks;
  embedding: Float32Array;
  alignedFace?: ImageData;
  mask?: ImageData;
  id?: number;
}

export interface SwapResult {
  image: ImageData;
  faces: FaceData[];
  processingTime: number;
}

// Embedded lightweight models (Base64 encoded)
// These are placeholder strings - replace with actual Base64 encoded models under 50MB
const EMBEDDED_MODELS = {
  // BlazeFace model (0.78MB) - can be embedded
  blazeface: '', // Add Base64 encoded model here
  
  // Lightweight face landmarks model (~5MB) - can be embedded
  landmarks: '', // Add Base64 encoded model here
  
  // SimSwap Light model (~30MB) - can be embedded
  simswap_light: '', // Add Base64 encoded model here
};

export class FaceSwapEngine {
  private faceDetector?: ort.InferenceSession;
  private faceLandmarks?: ort.InferenceSession;
  private faceSwapper?: ort.InferenceSession;
  private faceEnhancer?: ort.InferenceSession;
  private mpFaceLandmarker?: any;
  private mpFilesetResolver?: any;
  
  private config: FaceSwapConfig;
  private modelCache = new Map<string, ArrayBuffer>();
  
  constructor(config: Partial<FaceSwapConfig> = {}) {
    this.config = {
      modelQuality: 'medium',
      enableEnhancement: false,
      blendingMode: 'poisson',
      preserveExpression: true,
      useWebGL: true,
      ...config
    };
  }

  /**
   * Initialize the face swap engine by loading all required models
   */
  async initialize(): Promise<void> {
    console.log('Initializing FaceSwapEngine...');
    // Real model mode only – no demo mode
    // Defer heavy model downloads until processing
    const availableProviders = ort.env.wasm.proxy ? ['wasm'] : ['webgl', 'wasm'];
    console.log('Available execution providers:', availableProviders);
    console.log('Deferring model downloads until Swap is pressed');
  }

  /**
   * Initialize demo mode with mock functionality
   */
  private initializeDemoMode(): void {
    console.log('Initializing demo mode...');
    
    // Create mock sessions that simulate face detection and swapping
    this.faceDetector = {
      run: async () => ({
        boxes: new ort.Tensor('float32', new Float32Array([0.3, 0.3, 0.4, 0.4]), [1, 4]),
        scores: new ort.Tensor('float32', new Float32Array([0.95]), [1]),
        landmarks: new ort.Tensor('float32', new Float32Array(Array(136).fill(0.5)), [1, 136])
      })
    } as any;
    
    this.faceLandmarks = {
      run: async () => ({
        landmarks: new ort.Tensor('float32', new Float32Array(Array(136).fill(0.5)), [1, 136])
      })
    } as any;
    
    this.faceSwapper = {
      run: async () => ({
        output: new ort.Tensor('float32', new Float32Array(Array(256 * 256 * 3).fill(0)), [1, 3, 256, 256])
      })
    } as any;
    
    console.log('Demo mode initialized - face swap will use simulated effects');
  }

  /**
   * Load a model from URL, embedded data, or cache
   */
  private async loadModel(
    modelType: 'faceDetector' | 'faceLandmarks' | 'faceSwapper' | 'faceEnhancer',
    url: string
  ): Promise<void> {
    console.log(`Loading ${modelType} model from ${url}...`);
    
    let modelBuffer: ArrayBuffer;
    {
      // Check cache first
      modelBuffer = this.modelCache.get(url)!;
      
      if (!modelBuffer) {
        // Try IndexedDB cache
        const cachedBuffer = await this.loadFromIndexedDB(url);
        
        if (cachedBuffer) {
          modelBuffer = cachedBuffer;
        } else {
          // Download model
          try {
            const response = await fetch(url);
            if (!response.ok) {
              throw new Error(`Failed to fetch model from ${url}: ${response.statusText}`);
            } else {
              modelBuffer = await response.arrayBuffer();
              this.modelCache.set(url, modelBuffer);
              
              // Cache in IndexedDB for future sessions
              await this.cacheModelInIndexedDB(url, modelBuffer);
            }
          } catch (error) {
            console.error(`Failed to download model from ${url}:`, error);
            throw error;
          }
        }
      }
    }
    
    // Create inference session with proper execution providers
    const sessionOptions: ort.InferenceSession.SessionOptions = {
      executionProviders: this.config.useWebGL ? ['webgl', 'wasm'] : ['wasm'],
      graphOptimizationLevel: 'all',
      enableCpuMemArena: true,
      enableMemPattern: true,
      executionMode: 'sequential',
      logSeverityLevel: 2,
      logVerbosityLevel: 0,
    };
    
    try {
      const session = await ort.InferenceSession.create(modelBuffer, sessionOptions);
      console.log(`${modelType} model loaded successfully`);
      
      // Store session
      switch (modelType) {
        case 'faceDetector':
          this.faceDetector = session;
          break;
        case 'faceLandmarks':
          this.faceLandmarks = session;
          break;
        case 'faceSwapper':
          this.faceSwapper = session;
          break;
        case 'faceEnhancer':
          this.faceEnhancer = session;
          break;
      }
    } catch (error) {
      console.error(`Failed to create session for ${modelType}:`, error);
      // Try with WASM only as fallback
      sessionOptions.executionProviders = ['wasm'];
      try {
        const session = await ort.InferenceSession.create(modelBuffer, sessionOptions);
        console.log(`${modelType} model loaded with WASM fallback`);
        
        switch (modelType) {
          case 'faceDetector':
            this.faceDetector = session;
            break;
          case 'faceLandmarks':
            this.faceLandmarks = session;
            break;
          case 'faceSwapper':
            this.faceSwapper = session;
            break;
          case 'faceEnhancer':
            this.faceEnhancer = session;
            break;
        }
      } catch (fallbackError) {
        console.error(`Failed to load ${modelType} even with WASM fallback:`, fallbackError);
        if (modelType === 'faceSwapper') {
          console.warn('Proceeding without faceSwapper; geometric blend will be used.');
          return;
        }
        throw new Error(`Unable to load ${modelType} model. Please check the model file and try again.`);
      }
    }
  }

  /**
   * Create a mock model for demo purposes
   */
  private createMockModel(modelType: string): ArrayBuffer {
    console.warn(`Creating mock ${modelType} model for demo. This will not produce real results.`);
    
    // Create a minimal valid ONNX model structure
    // This is a simplified mock that won't work for real inference
    // but allows the demo to run without crashing
    const mockModelData = new Uint8Array([
      0x08, 0x01, 0x12, 0x00, 0x18, 0x00, 0x22, 0x00, // ONNX header
      0x0a, 0x00, 0x0a, 0x00, 0x0a, 0x00, 0x0a, 0x00, // Mock data
      // Add more bytes to make it look like a model
      ...new Array(1024).fill(0)
    ]);
    
    return mockModelData.buffer;
  }

  /**
   * Get model URLs based on quality setting
   */
  private getModelUrls() {
    const baseUrl = '/models/face-swap/';
    
    const urls = {
      detector: '',
      landmarks: '',
      swapper: '',
      enhancer: `${baseUrl}gfpgan_lite.onnx`
    };
    
    // Map qualities to concrete model files; always real models
    switch (this.config.modelQuality) {
      case 'low':
        urls.detector = `${baseUrl}blazeface.onnx`;
        urls.landmarks = `${baseUrl}face_landmarks_68.onnx`;
        // Prefer quantized INT8 if available; fall back to 128
        urls.swapper = `${baseUrl}inswapper_128.onnx`;
        break;
      case 'medium':
        // Use lightweight external models
        urls.detector = `${baseUrl}blazeface.onnx`;
        urls.landmarks = `${baseUrl}face_landmarks_68.onnx`;
        urls.swapper = `${baseUrl}inswapper_128.onnx`; // Use the actual model we have
        break;
      case 'high':
        // Use high quality external models
        urls.detector = `${baseUrl}blazeface.onnx`;
        urls.landmarks = `${baseUrl}face_landmarks_68.onnx`;
        urls.swapper = `${baseUrl}inswapper_128.onnx`; // Use the actual model we have
        break;
    }
    
    return urls;
  }

  /**
   * Load model from IndexedDB cache
   */
  private async loadFromIndexedDB(url: string): Promise<ArrayBuffer | null> {
    return new Promise((resolve) => {
      const request = indexedDB.open('FaceSwapModels', 1);
      
      request.onerror = () => resolve(null);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models');
        }
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        try {
          const transaction = db.transaction(['models'], 'readonly');
          const store = transaction.objectStore('models');
          const getRequest = store.get(url);
          
          getRequest.onsuccess = () => {
            const data = getRequest.result;
            if (data) {
              console.log(`Loaded ${url} from IndexedDB cache`);
              this.modelCache.set(url, data);
            }
            resolve(data || null);
          };
          
          getRequest.onerror = () => resolve(null);
        } catch (error) {
          console.error('IndexedDB error:', error);
          resolve(null);
        }
      };
    });
  }

  /**
   * Cache model in IndexedDB for offline use
   */
  private async cacheModelInIndexedDB(url: string, buffer: ArrayBuffer): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('FaceSwapModels', 1);
      
      request.onerror = () => reject(request.error);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models');
        }
      };
      
      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        const transaction = db.transaction(['models'], 'readwrite');
        const store = transaction.objectStore('models');
        
        const putRequest = store.put(buffer, url);
        putRequest.onsuccess = () => resolve();
        putRequest.onerror = () => reject(putRequest.error);
      };
    });
  }

  /**
   * Perform face swap on source and target images
   * Now supports selecting specific faces to swap
   */
  async swapFaces(
    sourceImage: ImageData,
    targetImage: ImageData,
    selectedSourceFaceIndex: number = 0,
    selectedTargetFaceIndices?: number[]
  ): Promise<SwapResult> {
    const startTime = performance.now();
    
    // No demo mode
    
    try {
      // Use simplified face detection for now
      const sourceFaces = await this.detectFacesSimplified(sourceImage);
      const targetFaces = await this.detectFacesSimplified(targetImage);
      
      if (sourceFaces.length === 0) {
        throw new Error('No face detected in source image');
      }
      
      if (targetFaces.length === 0) {
        throw new Error('No face detected in target image');
      }
      
      // Create canvas for processing (always do geometry-based swap; neural swap optional)
      const sourceCanvas = document.createElement('canvas');
      const targetCanvas = document.createElement('canvas');
      const resultCanvas = document.createElement('canvas');
      
      sourceCanvas.width = sourceImage.width;
      sourceCanvas.height = sourceImage.height;
      targetCanvas.width = targetImage.width;
      targetCanvas.height = targetImage.height;
      resultCanvas.width = targetImage.width;
      resultCanvas.height = targetImage.height;
      
      const sourceCtx = sourceCanvas.getContext('2d')!;
      const targetCtx = targetCanvas.getContext('2d')!;
      const resultCtx = resultCanvas.getContext('2d')!;
      
      // Draw images to canvases
      sourceCtx.putImageData(sourceImage, 0, 0);
      targetCtx.putImageData(targetImage, 0, 0);
      
      // Start with target image
      resultCtx.putImageData(targetImage, 0, 0);
      
      // For each selected target face
      const targetIndicesToSwap = selectedTargetFaceIndices || [0];
      for (const targetIndex of targetIndicesToSwap) {
        if (targetIndex < targetFaces.length) {
          const sourceFace = sourceFaces[selectedSourceFaceIndex];
          const targetFace = targetFaces[targetIndex];
          
          // Extract face region from source
          const sourceFaceData = sourceCtx.getImageData(
            sourceFace.boundingBox.x,
            sourceFace.boundingBox.y,
            sourceFace.boundingBox.width,
            sourceFace.boundingBox.height
          );

          try {
            // Landmark-aware piecewise warp and blending
            this.applyFaceSwapWithLandmarksBlend(
              resultCtx,
              sourceFaceData,
              sourceFace,
              targetFace,
              targetImage
            );
          } catch (e) {
            console.warn('Landmark blend failed, falling back to oval blend:', e);
            // Fallback: oval feather blend
            this.applyFaceSwapWithBlending(
              resultCtx,
              sourceFaceData,
              targetFace.boundingBox,
              targetImage.width,
              targetImage.height
            );
          }
        }
      }
      
      const resultImage = resultCtx.getImageData(0, 0, targetImage.width, targetImage.height);
      const processingTime = performance.now() - startTime;
      
      return {
        image: resultImage,
        faces: targetFaces,
        processingTime
      };
    } catch (error) {
      console.error('Face swap failed:', error);
      throw error;
    }
  }

  /**
   * Demo face swap - simulates face swapping without real models
   */
  private async demoSwapFaces(
    sourceImage: ImageData,
    targetImage: ImageData
  ): Promise<SwapResult> {
    console.log('Performing demo face swap...');
    
    // Create a copy of the target image
    const resultImage = new ImageData(
      new Uint8ClampedArray(targetImage.data),
      targetImage.width,
      targetImage.height
    );
    
    // Simulate face detection
    const mockFaces: FaceData[] = [
      {
        boundingBox: {
          x: targetImage.width * 0.3,
          y: targetImage.height * 0.2,
          width: targetImage.width * 0.4,
          height: targetImage.height * 0.5,
          confidence: 0.95
        },
        landmarks: {
          points: new Float32Array(136),
          confidence: 0.9
        },
        embedding: new Float32Array(512),
        id: 0
      }
    ];
    
    // Apply a simple effect to simulate face swap
    const canvas = new OffscreenCanvas(resultImage.width, resultImage.height);
    const ctx = canvas.getContext('2d')!;
    
    // Draw the result image
    ctx.putImageData(resultImage, 0, 0);
    
    // Draw source face region onto target
    const sourceCanvas = new OffscreenCanvas(sourceImage.width, sourceImage.height);
    const sourceCtx = sourceCanvas.getContext('2d')!;
    sourceCtx.putImageData(sourceImage, 0, 0);
    
    // Simple face region copy (demo effect)
    const face = mockFaces[0];
    const sx = sourceImage.width * 0.3;
    const sy = sourceImage.height * 0.2;
    const sw = sourceImage.width * 0.4;
    const sh = sourceImage.height * 0.5;
    
    // Apply some blending
    ctx.globalAlpha = 0.8;
    ctx.drawImage(
      sourceCanvas,
      sx, sy, sw, sh,
      face.boundingBox.x, face.boundingBox.y,
      face.boundingBox.width, face.boundingBox.height
    );
    
    // Add a blend effect around the edges
    ctx.globalAlpha = 1.0;
    ctx.filter = 'blur(10px)';
    
    // Create gradient mask
    const gradient = ctx.createRadialGradient(
      face.boundingBox.x + face.boundingBox.width / 2,
      face.boundingBox.y + face.boundingBox.height / 2,
      Math.min(face.boundingBox.width, face.boundingBox.height) * 0.3,
      face.boundingBox.x + face.boundingBox.width / 2,
      face.boundingBox.y + face.boundingBox.height / 2,
      Math.max(face.boundingBox.width, face.boundingBox.height) * 0.5
    );
    gradient.addColorStop(0, 'rgba(255,255,255,0)');
    gradient.addColorStop(1, 'rgba(255,255,255,0.3)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(
      face.boundingBox.x - 20,
      face.boundingBox.y - 20,
      face.boundingBox.width + 40,
      face.boundingBox.height + 40
    );
    
    const finalResult = ctx.getImageData(0, 0, resultImage.width, resultImage.height);
    
    return {
      image: finalResult,
      faces: mockFaces,
      processingTime: 100 + Math.random() * 200 // Simulate processing time
    };
  }

  /**
   * Simplified face detection for when we don't have detection models
   */
  private async ensureMediaPipe(): Promise<void> {
    if (!this.mpFilesetResolver || !this.mpFaceLandmarker) {
      const vision = await import('@mediapipe/tasks-vision');
      const { FaceLandmarker, FilesetResolver } = vision as any;
      const fileset = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22-rc.20250304/wasm'
      );
      const faceLandmarker = await FaceLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task'
        },
        numFaces: 5,
        runningMode: 'IMAGE'
      });
      this.mpFilesetResolver = fileset;
      this.mpFaceLandmarker = faceLandmarker;
    }
  }

  private async detectFacesSimplified(imageData: ImageData): Promise<FaceData[]> {
    // Use MediaPipe FaceLandmarker for real detection/landmarks
    await this.ensureMediaPipe();
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d')!;
    ctx.putImageData(imageData, 0, 0);
    const detections = this.mpFaceLandmarker.detect(canvas);
    const faces: FaceData[] = [];
    if (detections && detections.faceLandmarks && detections.faceLandmarks.length) {
      for (const lm of detections.faceLandmarks as Array<Array<{x:number,y:number}>>) {
        const xs = lm.map(p => p.x * imageData.width);
        const ys = lm.map(p => p.y * imageData.height);
        const minX = Math.max(0, Math.min(...xs));
        const maxX = Math.min(imageData.width, Math.max(...xs));
        const minY = Math.max(0, Math.min(...ys));
        const maxY = Math.min(imageData.height, Math.max(...ys));
        const w = Math.max(1, Math.round(maxX - minX));
        const h = Math.max(1, Math.round(maxY - minY));
        const points = new Float32Array(lm.length * 2);
        for (let i = 0; i < lm.length; i++) {
          points[i * 2] = lm[i].x * imageData.width;
          points[i * 2 + 1] = lm[i].y * imageData.height;
        }
    faces.push({
      boundingBox: {
            x: Math.round(minX),
            y: Math.round(minY),
            width: w,
            height: h,
            confidence: 0.99
      },
      landmarks: {
            points,
            confidence: 0.99
      },
      embedding: new Float32Array(512)
    });
      }
    }
    return faces;
  }

  /**
   * Public face detection API (currently simplified)
   */
  async detectFaces(imageData: ImageData): Promise<FaceData[]> {
    return this.detectFacesSimplified(imageData);
  }

  /**
   * Apply face swap with blending
   */
  private applyFaceSwapWithBlending(
    ctx: CanvasRenderingContext2D,
    sourceFaceData: ImageData,
    targetBox: BoundingBox,
    canvasWidth: number,
    canvasHeight: number
  ): void {
    // Create working canvases
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = targetBox.width;
    faceCanvas.height = targetBox.height;
    const faceCtx = faceCanvas.getContext('2d')!;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = sourceFaceData.width;
    srcCanvas.height = sourceFaceData.height;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.putImageData(sourceFaceData, 0, 0);

    // Step 1: Resize source face to target box
    faceCtx.drawImage(
      srcCanvas,
      0, 0, sourceFaceData.width, sourceFaceData.height,
      0, 0, targetBox.width, targetBox.height
    );
    
    // Step 2: Color match source face to target skin tone (per-channel mean/std)
    this.applyPerChannelColorTransfer(faceCtx, ctx, targetBox);

    // Step 3: Optional detail enhancement to avoid plastic look
    this.applyUnsharpMask(faceCtx, 1.2, 2);

    // Step 4: Build an elliptical feather mask shaped like a face oval
    const maskCanvas = this.createEllipticalFeatherMask(targetBox.width, targetBox.height, 0.46, 0.50);

    // Step 5: Multi-scale soften edges with a gentle halo to hide seams
    const blendedCanvas = this.multiScaleBlend(faceCanvas, maskCanvas);

    // Step 6: Draw onto result
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(blendedCanvas, targetBox.x, targetBox.y);
    ctx.restore();
  }

  // Landmarks-aware blending: uses detected target landmarks to place oval better and align rotation
  private applyFaceSwapWithLandmarksBlend(
    resultCtx: CanvasRenderingContext2D,
    sourceFaceData: ImageData,
    sourceFace: FaceData,
    targetFace: FaceData,
    targetImage: ImageData
  ): void {
    const targetBox = targetFace.boundingBox;
    // Create a working canvas for the scaled source face
    const faceCanvas = document.createElement('canvas');
    faceCanvas.width = targetBox.width;
    faceCanvas.height = targetBox.height;
    const faceCtx = faceCanvas.getContext('2d')!;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = sourceFaceData.width;
    srcCanvas.height = sourceFaceData.height;
    const srcCtx = srcCanvas.getContext('2d')!;
    srcCtx.putImageData(sourceFaceData, 0, 0);

    // Approximate rotation using eye landmarks if available
    let rotation = 0;
    const lm = targetFace.landmarks?.points;
    // Only try classic 68-pt indices; otherwise default to 0 rotation for stability
    if (lm && lm.length === 2 * 68) {
      const lc = this.meanPoint(lm, 36, 41);
      const rc = this.meanPoint(lm, 42, 47);
      rotation = Math.atan2(rc.y - lc.y, rc.x - lc.x) || 0;
    }

    // Draw with rotation alignment into faceCtx
    faceCtx.save();
    faceCtx.translate(targetBox.width / 2, targetBox.height / 2);
    faceCtx.rotate(rotation);
    faceCtx.drawImage(
      srcCanvas,
      0, 0, sourceFaceData.width, sourceFaceData.height,
      -targetBox.width / 2,
      -targetBox.height / 2,
      targetBox.width,
      targetBox.height
    );
    faceCtx.restore();

    // Color transfer and sharpening
    this.applyPerChannelColorTransfer(faceCtx, resultCtx, targetBox);
    this.applyUnsharpMask(faceCtx, 1.1, 1.8);

    // Build a mask from the convex hull of target facial landmarks for tighter fit
    let mask = this.createEllipticalFeatherMask(targetBox.width, targetBox.height, 0.5, 0.6);
    if (lm && lm.length >= 2 * 68) {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i < lm.length; i += 2) {
        pts.push({ x: lm[i] - targetBox.x, y: lm[i + 1] - targetBox.y });
      }
      mask = this.createHullFeatherMask(pts, targetBox.width, targetBox.height, 4);
    }

    // Rotate mask to match rotation
    const rotMask = document.createElement('canvas');
    rotMask.width = targetBox.width; rotMask.height = targetBox.height;
    const rctx = rotMask.getContext('2d')!;
    rctx.translate(targetBox.width / 2, targetBox.height / 2);
    rctx.rotate(rotation);
    rctx.drawImage(mask, -targetBox.width / 2, -targetBox.height / 2);

    // If detailed landmarks available, perform piecewise affine warp (triangle mesh) from source to target box
    if (
      targetFace.landmarks?.points && targetFace.landmarks.points.length >= 2 * 68 &&
      sourceFace.landmarks?.points && sourceFace.landmarks.points.length >= 2 * 68
    ) {
      try {
        const warped = this.piecewiseAffineWarp(srcCanvas, sourceFaceData, sourceFace, targetFace, targetBox);
        const blended = this.multiScaleBlend(warped, rotMask);
        resultCtx.save();
        resultCtx.globalCompositeOperation = 'source-over';
        resultCtx.drawImage(blended, targetBox.x, targetBox.y);
        resultCtx.restore();
        return;
      } catch {}
    }

    // Fallback to oval-aligned blend
    const blended = this.multiScaleBlend(faceCanvas, rotMask);
    resultCtx.save();
    resultCtx.globalCompositeOperation = 'source-over';
    resultCtx.drawImage(blended, targetBox.x, targetBox.y);
    resultCtx.restore();
  }

  // Piecewise affine warp using target landmarks and a canonical face grid
  private piecewiseAffineWarp(
    srcCanvas: HTMLCanvasElement,
    sourceFaceData: ImageData,
    sourceFace: FaceData,
    targetFace: FaceData,
    targetBox: BoundingBox
  ): HTMLCanvasElement {
    const targetLm = targetFace.landmarks.points; // Float32Array [x0,y0,x1,y1,...]
    const sourceLm = sourceFace.landmarks.points; // Float32Array [x0,y0,x1,y1,...]
    const w = targetBox.width;
    const h = targetBox.height;
    const out = document.createElement('canvas');
    out.width = w; out.height = h;
    const octx = out.getContext('2d')!;

    // Build a set of keypoints scaled into targetBox space
    // Select a subsample of landmarks to limit triangle count
    const totalPts = Math.floor(targetLm.length / 2);
    const desired = 120;
    const stride = Math.max(1, Math.floor(totalPts / desired));
    const targetPts: { x: number; y: number }[] = [];
    const sourcePts: { x: number; y: number }[] = [];
    for (let pi = 0, idx = 0; pi < targetLm.length; pi += 2, idx++) {
      if (idx % stride !== 0) continue;
      const tx = targetLm[pi] - targetBox.x;
      const ty = targetLm[pi + 1] - targetBox.y;
      targetPts.push({ x: tx, y: ty });
      const sx = ((sourceLm[pi] - sourceFace.boundingBox.x) * w) / sourceFace.boundingBox.width;
      const sy = ((sourceLm[pi + 1] - sourceFace.boundingBox.y) * h) / sourceFace.boundingBox.height;
      sourcePts.push({ x: sx, y: sy });
    }

    // Delaunay triangulation on target points
    const delaunay = Delaunator.from(targetPts as any, (p: any) => p.x, (p: any) => p.y);
    const triangles = delaunay.triangles; // indices into targetPts

    // Build a canonical source grid by normalizing sourceFaceData into target box size
    const normSrc = document.createElement('canvas');
    normSrc.width = w; normSrc.height = h;
    const nctx = normSrc.getContext('2d')!;
    const srcTmp = document.createElement('canvas');
    srcTmp.width = sourceFaceData.width; srcTmp.height = sourceFaceData.height;
    srcTmp.getContext('2d')!.putImageData(sourceFaceData, 0, 0);
    nctx.drawImage(srcTmp, 0, 0, w, h);

    // For each triangle, compute affine transform and draw
    for (let t = 0; t < triangles.length; t += 3) {
      const i0 = triangles[t];
      const i1 = triangles[t + 1];
      const i2 = triangles[t + 2];

      const dst = [ targetPts[i0], targetPts[i1], targetPts[i2] ];
      const src = [ sourcePts[i0], sourcePts[i1], sourcePts[i2] ];

      this.drawTriangleWarp(nctx.canvas, octx, src, dst);
    }

    return out;
  }

  private drawTriangleWarp(
    src: HTMLCanvasElement,
    dstCtx: CanvasRenderingContext2D,
    srcTri: Array<{ x: number; y: number }>,
    dstTri: Array<{ x: number; y: number }>
  ) {
    // Compute affine transform that maps srcTri to dstTri
    const [s0, s1, s2] = srcTri;
    const [d0, d1, d2] = dstTri;

    dstCtx.save();
    dstCtx.beginPath();
    dstCtx.moveTo(d0.x, d0.y);
    dstCtx.lineTo(d1.x, d1.y);
    dstCtx.lineTo(d2.x, d2.y);
    dstCtx.closePath();
    dstCtx.clip();

    // Solve transform matrix
    const denom = (s0.x * (s1.y - s2.y) + s1.x * (s2.y - s0.y) + s2.x * (s0.y - s1.y)) || 1;
    const a11 = (d0.x * (s1.y - s2.y) + d1.x * (s2.y - s0.y) + d2.x * (s0.y - s1.y)) / denom;
    const a12 = (d0.x * (s2.x - s1.x) + d1.x * (s0.x - s2.x) + d2.x * (s1.x - s0.x)) / denom;
    const a13 = (d0.x * (s1.x * s2.y - s2.x * s1.y) + d1.x * (s2.x * s0.y - s0.x * s2.y) + d2.x * (s0.x * s1.y - s1.x * s0.y)) / denom;
    const a21 = (d0.y * (s1.y - s2.y) + d1.y * (s2.y - s0.y) + d2.y * (s0.y - s1.y)) / denom;
    const a22 = (d0.y * (s2.x - s1.x) + d1.y * (s0.x - s2.x) + d2.y * (s1.x - s0.x)) / denom;
    const a23 = (d0.y * (s1.x * s2.y - s2.x * s1.y) + d1.y * (s2.x * s0.y - s0.x * s2.y) + d2.y * (s0.x * s1.y - s1.x * s0.y)) / denom;

    dstCtx.transform(a11, a21, a12, a22, a13, a23);
    dstCtx.drawImage(src, 0, 0);
    dstCtx.restore();
  }

  private meanPoint(lm: Float32Array, startIdx: number, endIdx: number): { x: number; y: number } {
    let sx = 0, sy = 0, c = 0;
    for (let i = startIdx; i <= endIdx; i++) {
      sx += lm[i * 2];
      sy += lm[i * 2 + 1];
      c++;
    }
    return { x: sx / c, y: sy / c };
  }

  // Create an elliptical feather mask with inner solid region and smooth falloff
  private createEllipticalFeatherMask(width: number, height: number, innerRadius: number, outerRadius: number): HTMLCanvasElement {
    const mask = document.createElement('canvas');
    mask.width = width;
    mask.height = height;
    const mctx = mask.getContext('2d')!;
    const cx = width / 2;
    const cy = height / 2;

    // Inner solid ellipse
    mctx.save();
    mctx.fillStyle = 'rgba(255,255,255,1)';
    mctx.beginPath();
    mctx.ellipse(cx, cy, width * innerRadius, height * innerRadius * 1.06, 0, 0, Math.PI * 2);
    mctx.fill();
    mctx.restore();

    // Outer fade ellipse
    const gradient = mctx.createRadialGradient(
      cx, cy, Math.min(width, height) * (innerRadius * 0.9),
      cx, cy, Math.min(width, height) * outerRadius
    );
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    mctx.globalCompositeOperation = 'source-over';
    mctx.fillStyle = gradient;
    mctx.beginPath();
    mctx.ellipse(cx, cy, width * outerRadius, height * outerRadius * 1.06, 0, 0, Math.PI * 2);
    mctx.fill();

    // Soften mask edges
    const soften = document.createElement('canvas');
    soften.width = width;
    soften.height = height;
    const sctx = soften.getContext('2d')!;
    sctx.filter = 'blur(4px)';
    sctx.drawImage(mask, 0, 0);
    return soften;
  }

  // Create a convex hull feather mask from landmark points (in target-box space)
  private createHullFeatherMask(points: Array<{ x: number; y: number }>, width: number, height: number, blurPx: number = 4): HTMLCanvasElement {
    if (points.length < 3) {
      return this.createEllipticalFeatherMask(width, height, 0.5, 0.6);
    }
    const hull = this.convexHull(points);
    const mask = document.createElement('canvas');
    mask.width = width; mask.height = height;
    const mctx = mask.getContext('2d')!;
    mctx.fillStyle = 'white';
    mctx.beginPath();
    mctx.moveTo(hull[0].x, hull[0].y);
    for (let i = 1; i < hull.length; i++) mctx.lineTo(hull[i].x, hull[i].y);
    mctx.closePath();
    mctx.fill();

    const softened = document.createElement('canvas');
    softened.width = width; softened.height = height;
    const sctx = softened.getContext('2d')!;
    sctx.filter = `blur(${blurPx}px)`;
    sctx.drawImage(mask, 0, 0);
    return softened;
  }

  // Monotone chain convex hull
  private convexHull(points: Array<{ x: number; y: number }>): Array<{ x: number; y: number }> {
    const pts = points.slice().sort((a, b) => (a.x === b.x ? a.y - b.y : a.x - b.x));
    const cross = (o: any, a: any, b: any) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower: any[] = [];
    for (const p of pts) {
      while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
      lower.push(p);
    }
    const upper: any[] = [];
    for (let i = pts.length - 1; i >= 0; i--) {
      const p = pts[i];
      while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
      upper.push(p);
    }
    upper.pop();
    lower.pop();
    return lower.concat(upper);
  }

  // Apply simple multiscale blending approximation
  private multiScaleBlend(faceCanvas: HTMLCanvasElement, maskCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const w = faceCanvas.width;
    const h = faceCanvas.height;
    const out = document.createElement('canvas');
    out.width = w;
    out.height = h;
    const octx = out.getContext('2d')!;

    // Base pass
    octx.drawImage(faceCanvas, 0, 0);

    // Build two softened variants
    const soft1 = document.createElement('canvas');
    soft1.width = w; soft1.height = h;
    const s1 = soft1.getContext('2d')!;
    s1.filter = 'blur(2px)';
    s1.drawImage(faceCanvas, 0, 0);

    const soft2 = document.createElement('canvas');
    soft2.width = w; soft2.height = h;
    const s2 = soft2.getContext('2d')!;
    s2.filter = 'blur(6px)';
    s2.drawImage(faceCanvas, 0, 0);

    // Combine with mask at different strengths to approximate multi-band
    const tmp = document.createElement('canvas');
    tmp.width = w; tmp.height = h;
    const tctx = tmp.getContext('2d')!;

    // High-frequency (original) with stronger inner mask
    tctx.clearRect(0, 0, w, h);
    tctx.drawImage(maskCanvas, 0, 0);
    tctx.globalCompositeOperation = 'destination-in';
    tctx.filter = 'blur(1px)';
    tctx.drawImage(maskCanvas, 0, 0);

    octx.save();
    octx.globalCompositeOperation = 'destination-in';
    octx.drawImage(tctx.canvas, 0, 0);
    octx.restore();

    // Mid-frequency
    const mid = document.createElement('canvas');
    mid.width = w; mid.height = h;
    const midctx = mid.getContext('2d')!;
    midctx.drawImage(soft1, 0, 0);
    midctx.globalCompositeOperation = 'destination-in';
    midctx.filter = 'blur(2px)';
    midctx.drawImage(maskCanvas, 0, 0);
    octx.globalCompositeOperation = 'destination-over';
    octx.drawImage(mid, 0, 0);

    // Low-frequency
    const low = document.createElement('canvas');
    low.width = w; low.height = h;
    const lowctx = low.getContext('2d')!;
    lowctx.drawImage(soft2, 0, 0);
    lowctx.globalCompositeOperation = 'destination-in';
    lowctx.filter = 'blur(6px)';
    lowctx.drawImage(maskCanvas, 0, 0);
    octx.globalCompositeOperation = 'destination-over';
    octx.globalAlpha = 0.65;
    octx.drawImage(low, 0, 0);
    octx.globalAlpha = 1;

    return out;
  }

  // Match source per-channel statistics to target region to reduce sticker look
  private applyPerChannelColorTransfer(faceCtx: CanvasRenderingContext2D, targetCtx: CanvasRenderingContext2D, targetBox: BoundingBox): void {
    const w = faceCtx.canvas.width;
    const h = faceCtx.canvas.height;
    const srcData = faceCtx.getImageData(0, 0, w, h);
    const tgtData = targetCtx.getImageData(targetBox.x, targetBox.y, targetBox.width, targetBox.height);

    const srcStats = this.computeMeanStd(srcData);
    const tgtStats = this.computeMeanStd(tgtData);

    const out = new ImageData(w, h);
    for (let i = 0; i < srcData.data.length; i += 4) {
      const r = srcData.data[i];
      const g = srcData.data[i + 1];
      const b = srcData.data[i + 2];
      const a = srcData.data[i + 3];

      out.data[i] = this.matchChannel(r, srcStats.meanR, srcStats.stdR, tgtStats.meanR, tgtStats.stdR);
      out.data[i + 1] = this.matchChannel(g, srcStats.meanG, srcStats.stdG, tgtStats.meanG, tgtStats.stdG);
      out.data[i + 2] = this.matchChannel(b, srcStats.meanB, srcStats.stdB, tgtStats.meanB, tgtStats.stdB);
      out.data[i + 3] = a;
    }
    faceCtx.putImageData(out, 0, 0);
  }

  private matchChannel(value: number, meanS: number, stdS: number, meanT: number, stdT: number): number {
    const s = stdS > 1 ? stdS : 1;
    const t = stdT > 1 ? stdT : 1;
    let v = (value - meanS) * (t / s) + meanT;
    if (v < 0) v = 0; if (v > 255) v = 255;
    return v | 0;
  }

  private computeMeanStd(img: ImageData): { meanR: number; meanG: number; meanB: number; stdR: number; stdG: number; stdB: number } {
    const d = img.data;
    let sr = 0, sg = 0, sb = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3] / 255;
      if (a === 0) continue;
      sr += d[i]; sg += d[i + 1]; sb += d[i + 2];
      n++;
    }
    const meanR = sr / Math.max(1, n);
    const meanG = sg / Math.max(1, n);
    const meanB = sb / Math.max(1, n);
    let vr = 0, vg = 0, vb = 0;
    for (let i = 0; i < d.length; i += 4) {
      const a = d[i + 3] / 255;
      if (a === 0) continue;
      vr += Math.pow(d[i] - meanR, 2);
      vg += Math.pow(d[i + 1] - meanG, 2);
      vb += Math.pow(d[i + 2] - meanB, 2);
    }
    const stdR = Math.sqrt(vr / Math.max(1, n));
    const stdG = Math.sqrt(vg / Math.max(1, n));
    const stdB = Math.sqrt(vb / Math.max(1, n));
    return { meanR, meanG, meanB, stdR, stdG, stdB };
  }

  // Simple unsharp mask to restore some details post color matching
  private applyUnsharpMask(ctx: CanvasRenderingContext2D, amount: number, radius: number): void {
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const original = ctx.getImageData(0, 0, w, h);

    const blurredCanvas = document.createElement('canvas');
    blurredCanvas.width = w; blurredCanvas.height = h;
    const bctx = blurredCanvas.getContext('2d')!;
    bctx.filter = `blur(${radius}px)`;
    bctx.drawImage(ctx.canvas, 0, 0);
    const blurred = bctx.getImageData(0, 0, w, h);

    const out = ctx.createImageData(w, h);
    for (let i = 0; i < original.data.length; i += 4) {
      const r = original.data[i];
      const g = original.data[i + 1];
      const b = original.data[i + 2];
      const br = blurred.data[i];
      const bg = blurred.data[i + 1];
      const bb = blurred.data[i + 2];
      out.data[i] = this.clamp255(r + (r - br) * amount);
      out.data[i + 1] = this.clamp255(g + (g - bg) * amount);
      out.data[i + 2] = this.clamp255(b + (b - bb) * amount);
      out.data[i + 3] = original.data[i + 3];
    }
    ctx.putImageData(out, 0, 0);
  }

  private clamp255(v: number): number { return v < 0 ? 0 : v > 255 ? 255 : v | 0; }

  /**
   * Simple face swap fallback
   */
  private async simpleFaceSwap(
    sourceImage: ImageData,
    targetImage: ImageData,
    sourceFaces: FaceData[],
    targetFaces: FaceData[]
  ): Promise<SwapResult> {
    const canvas = document.createElement('canvas');
    canvas.width = targetImage.width;
    canvas.height = targetImage.height;
    const ctx = canvas.getContext('2d')!;
    
    // Draw target image
    ctx.putImageData(targetImage, 0, 0);
    
    if (sourceFaces.length > 0 && targetFaces.length > 0) {
      const sourceFace = sourceFaces[0];
      const targetFace = targetFaces[0];
      
      // Extract source face
      const sourceCanvas = document.createElement('canvas');
      sourceCanvas.width = sourceImage.width;
      sourceCanvas.height = sourceImage.height;
      const sourceCtx = sourceCanvas.getContext('2d')!;
      sourceCtx.putImageData(sourceImage, 0, 0);
      
      const sourceFaceData = sourceCtx.getImageData(
        sourceFace.boundingBox.x,
        sourceFace.boundingBox.y,
        sourceFace.boundingBox.width,
        sourceFace.boundingBox.height
      );
      
      // Apply face swap
      this.applyFaceSwapWithBlending(
        ctx,
        sourceFaceData,
        targetFace.boundingBox,
        targetImage.width,
        targetImage.height
      );
    }
    
    const resultImage = ctx.getImageData(0, 0, targetImage.width, targetImage.height);
    
    return {
      image: resultImage,
      faces: targetFaces,
      processingTime: 100
    };
  }

  /**
   * Dispose of all loaded models
   */
  dispose(): void {
    // ONNX Runtime Web InferenceSession doesn't have a dispose method
    // Models are garbage collected when no longer referenced
    this.faceDetector = undefined;
    this.faceLandmarks = undefined;
    this.faceSwapper = undefined;
    this.faceEnhancer = undefined;
    
    this.modelCache.clear();
  }
} 