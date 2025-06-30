// Object Removal Web Worker
// This simulates the AI processing pipeline with LaMa and MobileSAM

interface ProcessingMessage {
  type: 'process';
  data: {
    originalImage: string;
    mask: ImageData;
    settings: {
      quality: 'fast' | 'balanced' | 'high';
      maskDilation: number;
      autoMask: boolean;
    };
  };
}

interface ProgressMessage {
  type: 'progress';
  stage: 'segmenting' | 'removing' | 'finalizing';
  progress: number;
}

interface ResultMessage {
  type: 'result';
  data: {
    processedImage: string;
  };
}

interface ErrorMessage {
  type: 'error';
  data: string;
}

// Simulate AI processing times based on quality settings
const getProcessingTimes = (quality: 'fast' | 'balanced' | 'high') => {
  switch (quality) {
    case 'fast':
      return { segmenting: 800, removing: 1500, finalizing: 700 };
    case 'balanced':
      return { segmenting: 1200, removing: 2500, finalizing: 1000 };
    case 'high':
      return { segmenting: 1800, removing: 4000, finalizing: 1500 };
  }
};

// Simulate progress updates
const simulateProgress = (
  stage: 'segmenting' | 'removing' | 'finalizing',
  duration: number,
  onProgress: (progress: number) => void
): Promise<void> => {
  return new Promise((resolve) => {
    const steps = 20;
    const stepDuration = duration / steps;
    let currentStep = 0;

    const interval = setInterval(() => {
      currentStep++;
      const progress = (currentStep / steps) * 100;
      onProgress(progress);

      if (currentStep >= steps) {
        clearInterval(interval);
        resolve();
      }
    }, stepDuration);
  });
};

// Simulate object removal processing
const processObjectRemoval = async (
  originalImage: string,
  mask: ImageData,
  settings: ProcessingMessage['data']['settings']
): Promise<string> => {
  const times = getProcessingTimes(settings.quality);

  // Stage 1: Segmenting (MobileSAM simulation)
  self.postMessage({
    type: 'progress',
    stage: 'segmenting',
    progress: 0
  } as ProgressMessage);

  await simulateProgress('segmenting', times.segmenting, (progress) => {
    self.postMessage({
      type: 'progress',
      stage: 'segmenting',
      progress
    } as ProgressMessage);
  });

  // Stage 2: Removing (LaMa simulation)
  self.postMessage({
    type: 'progress',
    stage: 'removing',
    progress: 0
  } as ProgressMessage);

  await simulateProgress('removing', times.removing, (progress) => {
    self.postMessage({
      type: 'progress',
      stage: 'removing',
      progress
    } as ProgressMessage);
  });

  // Stage 3: Finalizing
  self.postMessage({
    type: 'progress',
    stage: 'finalizing',
    progress: 0
  } as ProgressMessage);

  await simulateProgress('finalizing', times.finalizing, (progress) => {
    self.postMessage({
      type: 'progress',
      stage: 'finalizing',
      progress
    } as ProgressMessage);
  });

  // Simulate the actual processing
  return simulateImageProcessing(originalImage, mask, settings);
};

// Simulate image processing with canvas manipulation
const simulateImageProcessing = async (
  originalImage: string,
  mask: ImageData,
  settings: ProcessingMessage['data']['settings']
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      // Create image element
      const img = new Image();
      img.onload = () => {
        // Create canvas for processing
        const canvas = new OffscreenCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d');
        
        if (!ctx) {
          reject('Canvas context not available');
          return;
        }

        // Draw original image
        ctx.drawImage(img, 0, 0);
        
        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;

        // Scale mask to image size
        const maskCanvas = new OffscreenCanvas(mask.width, mask.height);
        const maskCtx = maskCanvas.getContext('2d');
        if (maskCtx) {
          maskCtx.putImageData(mask, 0, 0);
        }

        // Resize mask to match image
        const scaledMaskCanvas = new OffscreenCanvas(canvas.width, canvas.height);
        const scaledMaskCtx = scaledMaskCanvas.getContext('2d');
        if (scaledMaskCtx) {
          scaledMaskCtx.drawImage(maskCanvas, 0, 0, canvas.width, canvas.height);
          const scaledMask = scaledMaskCtx.getImageData(0, 0, canvas.width, canvas.height);

          // Apply simulated inpainting
          simulateInpainting(data, scaledMask.data, canvas.width, canvas.height, settings);
          
          // Put processed data back
          ctx.putImageData(imageData, 0, 0);
          
          // Convert to blob and then to data URL
          canvas.convertToBlob({ type: 'image/png', quality: 1.0 }).then(blob => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve(reader.result as string);
            };
            reader.readAsDataURL(blob);
          });
        } else {
          reject('Mask context not available');
        }
      };
      
      img.onerror = () => {
        reject('Failed to load image');
      };
      
      img.src = originalImage;
    } catch (error) {
      reject(`Processing failed: ${error}`);
    }
  });
};

// Simulate inpainting algorithm
const simulateInpainting = (
  imageData: Uint8ClampedArray,
  maskData: Uint8ClampedArray,
  width: number,
  height: number,
  settings: ProcessingMessage['data']['settings']
): void => {
  // Simple inpainting simulation using neighboring pixels
  const iterations = settings.quality === 'high' ? 10 : settings.quality === 'balanced' ? 5 : 3;
  
  for (let iter = 0; iter < iterations; iter++) {
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const idx = (y * width + x) * 4;
        
        // Check if this pixel needs inpainting (mask alpha > 0)
        if (maskData[idx + 3] > 128) {
          // Average surrounding pixels
          let r = 0, g = 0, b = 0, count = 0;
          
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              if (dx === 0 && dy === 0) continue;
              
              const nx = x + dx;
              const ny = y + dy;
              const nidx = (ny * width + nx) * 4;
              
              // Only use pixels that are not masked
              if (maskData[nidx + 3] <= 128) {
                r += imageData[nidx];
                g += imageData[nidx + 1];
                b += imageData[nidx + 2];
                count++;
              }
            }
          }
          
          if (count > 0) {
            imageData[idx] = Math.round(r / count);
            imageData[idx + 1] = Math.round(g / count);
            imageData[idx + 2] = Math.round(b / count);
          }
        }
      }
    }
  }
  
  // Add some noise for realism
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      
      if (maskData[idx + 3] > 128) {
        const noise = (Math.random() - 0.5) * 10;
        imageData[idx] = Math.max(0, Math.min(255, imageData[idx] + noise));
        imageData[idx + 1] = Math.max(0, Math.min(255, imageData[idx + 1] + noise));
        imageData[idx + 2] = Math.max(0, Math.min(255, imageData[idx + 2] + noise));
      }
    }
  }
};

// Worker message handler
self.addEventListener('message', async (event) => {
  const message = event.data as ProcessingMessage;
  
  if (message.type === 'process') {
    try {
      const { originalImage, mask, settings } = message.data;
      
      // Validate inputs
      if (!originalImage || !mask) {
        throw new Error('Missing required inputs');
      }
      
      // Process the image
      const processedImage = await processObjectRemoval(originalImage, mask, settings);
      
      // Send result
      self.postMessage({
        type: 'result',
        data: { processedImage }
      } as ResultMessage);
      
    } catch (error) {
      // Send error
      self.postMessage({
        type: 'error',
        data: error instanceof Error ? error.message : 'Unknown error occurred'
      } as ErrorMessage);
    }
  }
});

// Handle worker errors
self.addEventListener('error', (error) => {
  self.postMessage({
    type: 'error',
    data: `Worker error: ${error.message}`
  } as ErrorMessage);
});

// Export types for TypeScript (these won't be included in the compiled worker)
export type { ProcessingMessage, ProgressMessage, ResultMessage, ErrorMessage };