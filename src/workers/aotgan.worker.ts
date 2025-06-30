/**
 * Simple Inpainting Worker
 *
 * This worker uses the Telea inpainting algorithm implemented in pure JavaScript
 * for reliable, fast inpainting that works in any browser without dependencies.
 */

interface InitMessage { command: 'initialize'; }
interface ProcessMessage {
  command: 'process';
  imageData: ImageData;
  maskData: ImageData;
}

type WorkerMessage = InitMessage | ProcessMessage;

let isInitialized = false;

self.onmessage = async (e: MessageEvent<WorkerMessage>) => {
  const { command } = e.data;
  try {
    switch (command) {
      case 'initialize':
        await initializeInpainter();
        break;
      case 'process':
        await processImage(e.data.imageData, e.data.maskData);
        break;
    }
  } catch (error) {
    self.postMessage({
      status: 'error',
      error: `Inpainting Error: ${error instanceof Error ? error.message : String(error)}`
    });
  }
};

async function initializeInpainter() {
  try {
    self.postMessage({ status: 'loading', message: 'Initializing inpainting algorithm...' });
    
    // Simple initialization - no models to download
    isInitialized = true;
    
    self.postMessage({ 
      status: 'initialized', 
      message: 'Ready for brush-based masking' 
    });
  } catch (error) {
    throw new Error(`Initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

async function processImage(imageData: ImageData, maskData: ImageData) {
  if (!isInitialized) {
    throw new Error('Inpainter not initialized');
  }

  const startTime = performance.now();
  
  self.postMessage({ 
    status: 'processing', 
    message: 'Preparing image data...',
    progress: 0.1 
  });

  const result = tealeaInpaint(imageData, maskData);
  
  const totalTime = performance.now() - startTime;
  
  self.postMessage({
    status: 'complete',
    resultImageData: result,
    performanceStats: {
      totalTime,
      modelUsed: 'Telea Algorithm',
      acceleration: 'CPU'
    }
  });
}

/**
 * Telea Inpainting Algorithm Implementation
 * Based on "An Image Inpainting Technique Based on the Fast Marching Method" by Alexandru Telea
 */
function tealeaInpaint(imageData: ImageData, maskData: ImageData): ImageData {
  const { width, height } = imageData;
  const result = new ImageData(new Uint8ClampedArray(imageData.data), width, height);
  
  // Convert mask to binary (0 = keep, 1 = inpaint)
  const mask = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    // If mask pixel is dark (< 128), mark for inpainting
    mask[i] = maskData.data[i * 4] < 128 ? 1 : 0;
  }
  
  self.postMessage({ 
    status: 'processing', 
    message: 'Running inpainting algorithm...',
    progress: 0.3 
  });
  
  // Priority queue for fast marching
  const heap: Array<{x: number, y: number, dist: number}> = [];
  const distances = new Float32Array(width * height);
  const processed = new Uint8Array(width * height);
  
  // Initialize distances and find boundary pixels
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      
      if (mask[idx] === 0) {
        distances[idx] = 0;
        processed[idx] = 1;
        
        // Check if this pixel is adjacent to an inpaint region
        const neighbors = [
          [x-1, y], [x+1, y], [x, y-1], [x, y+1]
        ];
        
        for (const [nx, ny] of neighbors) {
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const nIdx = ny * width + nx;
            if (mask[nIdx] === 1 && processed[nIdx] === 0) {
              distances[nIdx] = 1;
              heap.push({x: nx, y: ny, dist: 1});
              processed[nIdx] = 1;
            }
          }
        }
      } else {
        distances[idx] = Infinity;
      }
    }
  }
  
  // Sort initial heap
  heap.sort((a, b) => a.dist - b.dist);
  
  self.postMessage({ 
    status: 'processing', 
    message: 'Computing pixel values...',
    progress: 0.6 
  });
  
  // Process pixels in order of distance
  while (heap.length > 0) {
    const current = heap.shift()!;
    const {x, y} = current;
    const idx = y * width + x;
    
    if (mask[idx] === 0) continue; // Skip known pixels
    
    // Compute inpainted value using weighted average of known neighbors
    let sumR = 0, sumG = 0, sumB = 0, sumWeight = 0;
    
    // Look at pixels in a small radius
    const radius = 3;
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = x + dx;
        const ny = y + dy;
        
        if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
          const nIdx = ny * width + nx;
          
          if (mask[nIdx] === 0) { // Known pixel
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist > 0) {
              const weight = 1 / (dist * dist);
              const pixelIdx = nIdx * 4;
              
              sumR += result.data[pixelIdx] * weight;
              sumG += result.data[pixelIdx + 1] * weight;
              sumB += result.data[pixelIdx + 2] * weight;
              sumWeight += weight;
            }
          }
        }
      }
    }
    
    if (sumWeight > 0) {
      const pixelIdx = idx * 4;
      result.data[pixelIdx] = Math.round(sumR / sumWeight);     // R
      result.data[pixelIdx + 1] = Math.round(sumG / sumWeight); // G
      result.data[pixelIdx + 2] = Math.round(sumB / sumWeight); // B
      result.data[pixelIdx + 3] = 255; // A
    }
    
    mask[idx] = 0; // Mark as processed
    
    // Add new neighbors to heap
    const neighbors = [
      [x-1, y], [x+1, y], [x, y-1], [x, y+1]
    ];
    
    for (const [nx, ny] of neighbors) {
      if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
        const nIdx = ny * width + nx;
        if (mask[nIdx] === 1 && processed[nIdx] === 0) {
          const newDist = distances[idx] + 1;
          if (newDist < distances[nIdx]) {
            distances[nIdx] = newDist;
            heap.push({x: nx, y: ny, dist: newDist});
            processed[nIdx] = 1;
          }
        }
      }
    }
    
    // Re-sort heap periodically
    if (heap.length % 100 === 0) {
      heap.sort((a, b) => a.dist - b.dist);
    }
  }
  
  self.postMessage({ 
    status: 'processing', 
    message: 'Finalizing result...',
    progress: 0.9 
  });
  
  return result;
}

/*
  AOT-GAN Inpainting Worker
  -------------------------
  Performs masked image inpainting using Qualcomm's AOT-GAN ONNX model directly in the browser via onnxruntime-web.
  Expects message: { imageBuffer: ArrayBuffer, maskData: ImageData, width: number, height: number }
  Returns: { success: boolean, imageDataUrl?: string, error?: string }
*/

import * as ort from 'onnxruntime-web';

// Decode image bytes to ImageData of desired size
async function decodeImage(buffer: ArrayBuffer, width: number, height: number): Promise<ImageData> {
  const blob = new Blob([buffer]);
  const bitmap = await createImageBitmap(blob);
  const canvas = new OffscreenCanvas(width, height);
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, width, height);
  return ctx.getImageData(0, 0, width, height);
}

// Convert ImageData -> Float32 tensor (channels first, values in [-1, 1])
function imageToTensor(img: ImageData): ort.Tensor {
  const { width, height } = img;
  const data = new Float32Array(3 * width * height);
  let r = 0, g = width * height, b = 2 * width * height;
  for (let i = 0; i < img.data.length; i += 4) {
    const rn = (img.data[i] / 127.5) - 1;
    const gn = (img.data[i + 1] / 127.5) - 1;
    const bn = (img.data[i + 2] / 127.5) - 1;
    data[r++] = rn;
    data[g++] = gn;
    data[b++] = bn;
  }
  return new ort.Tensor('float32', data, [1, 3, height, width]);
}

// Convert binary mask ImageData -> Float32 tensor (0 or 1)
function maskToTensor(mask: ImageData): ort.Tensor {
  const { width, height } = mask;
  const data = new Float32Array(width * height);
  for (let i = 0, j = 0; i < mask.data.length; i += 4, j++) {
    data[j] = mask.data[i] > 127 ? 1 : 0;
  }
  return new ort.Tensor('float32', data, [1, 1, height, width]);
}

// Tensor -> ImageData
function tensorToImage(t: ort.Tensor, width: number, height: number): ImageData {
  const d = t.data as Float32Array;
  const out = new Uint8ClampedArray(width * height * 4);
  let r = 0, g = width * height, b = 2 * width * height;
  for (let i = 0; i < width * height; i++) {
    out[i * 4] = Math.min(255, Math.max(0, Math.round((d[r++] + 1) * 127.5)));
    out[i * 4 + 1] = Math.min(255, Math.max(0, Math.round((d[g++] + 1) * 127.5)));
    out[i * 4 + 2] = Math.min(255, Math.max(0, Math.round((d[b++] + 1) * 127.5)));
    out[i * 4 + 3] = 255;
  }
  return new ImageData(out, width, height);
}

let sessionPromise: Promise<ort.InferenceSession> | null = null;
function getSession(): Promise<ort.InferenceSession> {
  if (sessionPromise) return sessionPromise;
  sessionPromise = (async () => {
    const opts: ort.InferenceSession.SessionOptions = {
      executionProviders: ['webgpu', 'wasm', 'webgl'],
    } as any;
    const url = new URL('/models/aot-gan.onnx', self.location.href).href;
    return ort.InferenceSession.create(url, opts);
  })();
  return sessionPromise;
}

self.onmessage = async (e) => {
  const { imageBuffer, maskData, width, height } = e.data as {
    imageBuffer: ArrayBuffer; maskData: ImageData; width: number; height: number;
  };
  try {
    const [session, img] = await Promise.all([getSession(), decodeImage(imageBuffer, width, height)]);
    const feeds: Record<string, ort.Tensor> = {};
    const [inputImageName, inputMaskName] = session.inputNames;
    feeds[inputImageName] = imageToTensor(img);
    feeds[inputMaskName] = maskToTensor(maskData);
    const res = await session.run(feeds);
    const output = res[session.outputNames[0]];
    const outImg = tensorToImage(output, width, height);
    const canvas = new OffscreenCanvas(width, height);
    canvas.getContext('2d')!.putImageData(outImg, 0, 0);
    const blob = await canvas.convertToBlob({ type: 'image/png' });
    const urlReader = new FileReader();
    urlReader.onloadend = () => self.postMessage({ success: true, imageDataUrl: urlReader.result });
    urlReader.readAsDataURL(blob);
  } catch (err: any) {
    self.postMessage({ success: false, error: err?.message ?? String(err) });
  }
}; 