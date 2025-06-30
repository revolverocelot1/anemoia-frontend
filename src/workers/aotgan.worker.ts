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
      status: 'ready', 
      message: 'Inpainting ready!' 
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
    result: result,
    performance: {
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