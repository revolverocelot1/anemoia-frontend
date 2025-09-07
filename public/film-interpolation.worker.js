// FILM-like Frame Interpolation Worker
// This implements a simplified version of frame interpolation inspired by FILM
// For production, you would want to use the actual FILM model with TensorFlow.js

// Signal that the worker is ready
self.postMessage({ type: 'ready' });

self.onmessage = async function(e) {
  const { type, data } = e.data;
  
  if (type === 'interpolate') {
    const { frame1, frame2, numIntermediateFrames } = data;
    
    try {
      // Convert base64 to image data
      const img1 = await base64ToImageData(frame1);
      const img2 = await base64ToImageData(frame2);
      
      const interpolatedFrames = [];
      
      // Generate intermediate frames
      for (let i = 1; i <= numIntermediateFrames; i++) {
        const alpha = i / (numIntermediateFrames + 1);
        const interpolatedFrame = interpolateFrames(img1, img2, alpha);
        const base64 = await imageDataToBase64(interpolatedFrame);
        
        interpolatedFrames.push(base64);
        
        // Send progress update
        self.postMessage({
          type: 'progress',
          progress: (i / numIntermediateFrames) * 100
        });
      }
      
      self.postMessage({
        type: 'complete',
        frames: interpolatedFrames
      });
      
    } catch (error) {
      self.postMessage({
        type: 'error',
        error: error.message
      });
    }
  }
};

// Convert base64 to ImageData
async function base64ToImageData(base64) {
  try {
    // Extract the base64 data (remove data URL prefix if present)
    const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
    
    // Convert base64 to binary
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Create blob from bytes
    const blob = new Blob([bytes], { type: 'image/png' });
    
    // Create bitmap from blob
    const bitmap = await createImageBitmap(blob);
    
    // Create canvas and draw bitmap
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(bitmap, 0, 0);
    
    // Get and return ImageData
    return ctx.getImageData(0, 0, bitmap.width, bitmap.height);
  } catch (error) {
    throw new Error('Failed to convert base64 to ImageData: ' + error.message);
  }
}

// Convert ImageData to base64
async function imageDataToBase64(imageData) {
  const canvas = new OffscreenCanvas(imageData.width, imageData.height);
  const ctx = canvas.getContext('2d');
  ctx.putImageData(imageData, 0, 0);
  const blob = await canvas.convertToBlob({ type: 'image/png' });
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

// Simplified frame interpolation
// In a real implementation, this would use optical flow and advanced blending
function interpolateFrames(frame1, frame2, alpha) {
  const width = frame1.width;
  const height = frame1.height;
  const result = new ImageData(width, height);
  
  const data1 = frame1.data;
  const data2 = frame2.data;
  const resultData = result.data;
  
  // Simple linear interpolation with motion-aware blending
  for (let i = 0; i < data1.length; i += 4) {
    // Extract pixel values
    const r1 = data1[i];
    const g1 = data1[i + 1];
    const b1 = data1[i + 2];
    const a1 = data1[i + 3];
    
    const r2 = data2[i];
    const g2 = data2[i + 1];
    const b2 = data2[i + 2];
    const a2 = data2[i + 3];
    
    // Calculate pixel difference (simple motion detection)
    const diff = Math.abs(r1 - r2) + Math.abs(g1 - g2) + Math.abs(b1 - b2);
    const motionFactor = Math.min(diff / 255, 1);
    
    // Apply motion-aware interpolation
    // Areas with more motion get smoother transitions
    const smoothAlpha = smoothstep(alpha, motionFactor);
    
    // Interpolate colors
    resultData[i] = Math.round(r1 * (1 - smoothAlpha) + r2 * smoothAlpha);
    resultData[i + 1] = Math.round(g1 * (1 - smoothAlpha) + g2 * smoothAlpha);
    resultData[i + 2] = Math.round(b1 * (1 - smoothAlpha) + b2 * smoothAlpha);
    resultData[i + 3] = Math.round(a1 * (1 - smoothAlpha) + a2 * smoothAlpha);
  }
  
  // Apply slight gaussian blur for smoother results
  return applyGaussianBlur(result, 0.5);
}

// Smoothstep function for smoother transitions
function smoothstep(t, motion) {
  const adjusted = t * (1 + motion * 0.5);
  const clamped = Math.max(0, Math.min(1, adjusted));
  return clamped * clamped * (3 - 2 * clamped);
}

// Simple Gaussian blur implementation
function applyGaussianBlur(imageData, radius) {
  const width = imageData.width;
  const height = imageData.height;
  const data = imageData.data;
  const output = new ImageData(width, height);
  const outputData = output.data;
  
  // Simplified 3x3 Gaussian kernel
  const kernel = [
    [1, 2, 1],
    [2, 4, 2],
    [1, 2, 1]
  ];
  const kernelSum = 16;
  
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      let r = 0, g = 0, b = 0, a = 0;
      
      for (let ky = -1; ky <= 1; ky++) {
        for (let kx = -1; kx <= 1; kx++) {
          const idx = ((y + ky) * width + (x + kx)) * 4;
          const weight = kernel[ky + 1][kx + 1];
          
          r += data[idx] * weight;
          g += data[idx + 1] * weight;
          b += data[idx + 2] * weight;
          a += data[idx + 3] * weight;
        }
      }
      
      const idx = (y * width + x) * 4;
      outputData[idx] = Math.round(r / kernelSum);
      outputData[idx + 1] = Math.round(g / kernelSum);
      outputData[idx + 2] = Math.round(b / kernelSum);
      outputData[idx + 3] = Math.round(a / kernelSum);
    }
  }
  
  // Copy edges
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
        const idx = (y * width + x) * 4;
        outputData[idx] = data[idx];
        outputData[idx + 1] = data[idx + 1];
        outputData[idx + 2] = data[idx + 2];
        outputData[idx + 3] = data[idx + 3];
      }
    }
  }
  
  return output;
}

// Advanced interpolation using pyramidal approach (simplified)
function pyramidalInterpolation(frame1, frame2, alpha) {
  // This would implement a multi-scale approach similar to FILM
  // For now, we'll use the simple interpolation
  return interpolateFrames(frame1, frame2, alpha);
}

// Initialize the worker
self.postMessage({ type: 'ready' });
