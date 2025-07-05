// Comparison Worker for Image Analysis - Simplified Version

// Types for communication
interface ComparisonRequest {
  image1Data: ImageData;
  image2Data: ImageData;
  settings: {
    enableAnnotations: boolean;
    enableOcr: boolean;
    enableClassification: boolean;
    normalizeAspectRatio: boolean;
  };
}

interface BoundingBox {
  id: number;
  x: number;
  y: number;
  w: number;
  h: number;
  area: number;
  intensity?: number;
}

interface ClassificationResult {
  className: string;
  probability: number;
  bbox?: number[] | null;
}

interface AnalysisResults {
  stats: {
    mismatchedPixels: number;
    differencesFound: number;
    mse: number;
    ssim: number;
    imageWidth: number;
    imageHeight: number;
    pixelDiffPercentage: number;
  };
  annotations?: {
    diffImageData: ImageData | null;
    differences: BoundingBox[];
  };
  ocr?: {
    image1: string;
    image2: string;
  };
  classification?: {
    image1: ClassificationResult[];
    image2: ClassificationResult[];
  };
}

// Helper function to calculate Mean Squared Error
function calculateMSE(data1: Uint8ClampedArray, data2: Uint8ClampedArray): number {
  let sum = 0;
  const pixelCount = data1.length / 4;
  
  for (let i = 0; i < data1.length; i += 4) {
    const dr = data1[i] - data2[i];
    const dg = data1[i + 1] - data2[i + 1];
    const db = data1[i + 2] - data2[i + 2];
    sum += (dr * dr + dg * dg + db * db) / 3;
  }
  
  return sum / pixelCount;
}

// Helper function to calculate SSIM (Structural Similarity Index)
function calculateSSIM(data1: Uint8ClampedArray, data2: Uint8ClampedArray, width: number, height: number): number {
  const k1 = 0.01;
  const k2 = 0.03;
  const L = 255; // dynamic range
  const c1 = (k1 * L) ** 2;
  const c2 = (k2 * L) ** 2;
  
  let sum1 = 0, sum2 = 0, sum1Sq = 0, sum2Sq = 0, sum12 = 0;
  const pixelCount = width * height;
  
  for (let i = 0; i < data1.length; i += 4) {
    // Convert to grayscale
    const gray1 = 0.299 * data1[i] + 0.587 * data1[i + 1] + 0.114 * data1[i + 2];
    const gray2 = 0.299 * data2[i] + 0.587 * data2[i + 1] + 0.114 * data2[i + 2];
    
    sum1 += gray1;
    sum2 += gray2;
    sum1Sq += gray1 * gray1;
    sum2Sq += gray2 * gray2;
    sum12 += gray1 * gray2;
  }
  
  const mu1 = sum1 / pixelCount;
  const mu2 = sum2 / pixelCount;
  const sigma1Sq = (sum1Sq / pixelCount) - (mu1 * mu1);
  const sigma2Sq = (sum2Sq / pixelCount) - (mu2 * mu2);
  const sigma12 = (sum12 / pixelCount) - (mu1 * mu2);
  
  const numerator = (2 * mu1 * mu2 + c1) * (2 * sigma12 + c2);
  const denominator = (mu1 * mu1 + mu2 * mu2 + c1) * (sigma1Sq + sigma2Sq + c2);
  
  return numerator / denominator;
}

// Find differences between images
function findDifferences(data1: Uint8ClampedArray, data2: Uint8ClampedArray, width: number, height: number): {
  diffImageData: ImageData;
  differences: BoundingBox[];
  mismatchedPixels: number;
} {
  const diffData = new Uint8ClampedArray(data1.length);
  const visited = new Array(width * height).fill(false);
  const differences: BoundingBox[] = [];
  let mismatchedPixels = 0;
  
  // Create difference map
  for (let i = 0; i < data1.length; i += 4) {
    const dr = Math.abs(data1[i] - data2[i]);
    const dg = Math.abs(data1[i + 1] - data2[i + 1]);
    const db = Math.abs(data1[i + 2] - data2[i + 2]);
    const diff = (dr + dg + db) / 3;
    
    if (diff > 10) { // Threshold for difference
      mismatchedPixels++;
      diffData[i] = 255;     // Red channel
      diffData[i + 1] = 0;   // Green channel
      diffData[i + 2] = 0;   // Blue channel
      diffData[i + 3] = 255; // Alpha channel
    } else {
      // Copy original pixel with reduced opacity
      diffData[i] = data2[i];
      diffData[i + 1] = data2[i + 1];
      diffData[i + 2] = data2[i + 2];
      diffData[i + 3] = 128;
    }
  }
  
  // Find connected components (difference regions)
  let regionId = 1;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      if (diffData[idx] === 255 && !visited[y * width + x]) {
        const region = floodFill(diffData, visited, width, height, x, y);
        if (region.area > 50) { // Minimum area threshold
          differences.push({
            id: regionId++,
            ...region
          });
        }
      }
    }
  }
  
  return {
    diffImageData: new ImageData(diffData, width, height),
    differences: differences.slice(0, 20), // Limit to top 20 regions
    mismatchedPixels
  };
}

// Flood fill algorithm to find connected regions
function floodFill(data: Uint8ClampedArray, visited: boolean[], width: number, height: number, startX: number, startY: number): {
  x: number; y: number; w: number; h: number; area: number; intensity: number;
} {
  const stack = [{x: startX, y: startY}];
  let minX = startX, maxX = startX, minY = startY, maxY = startY;
  let area = 0;
  let totalIntensity = 0;
  
  while (stack.length > 0) {
    const {x, y} = stack.pop()!;
    const idx = y * width + x;
    
    if (x < 0 || x >= width || y < 0 || y >= height || visited[idx]) continue;
    
    const pixelIdx = idx * 4;
    if (data[pixelIdx] !== 255) continue;
    
    visited[idx] = true;
    area++;
    totalIntensity += data[pixelIdx];
    
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
    
    // Add neighbors
    stack.push({x: x + 1, y}, {x: x - 1, y}, {x, y: y + 1}, {x, y: y - 1});
  }
  
  return {
    x: minX,
    y: minY,
    w: maxX - minX + 1,
    h: maxY - minY + 1,
    area,
    intensity: Math.round(totalIntensity / area)
  };
}

// Main worker message handler
self.addEventListener('message', async (event) => {
  const { image1Data, image2Data, settings } = event.data as ComparisonRequest;
  
  console.log('Worker received message:', { settings });
  
  try {
    // Post initial status
    self.postMessage({ type: 'status', message: 'Starting comparison analysis...' });
    
    // Calculate basic statistics
    console.log('Calculating MSE and SSIM...');
    const mse = calculateMSE(image1Data.data, image2Data.data);
    const ssim = calculateSSIM(image1Data.data, image2Data.data, image1Data.width, image1Data.height);
    
    // Initialize results
    const results: AnalysisResults = {
      stats: {
        mismatchedPixels: 0,
        differencesFound: 0,
        mse,
        ssim,
        imageWidth: image1Data.width,
        imageHeight: image1Data.height,
        pixelDiffPercentage: 0
      }
    };
    
    // Find differences if enabled
    if (settings.enableAnnotations) {
      self.postMessage({ type: 'status', message: 'Analyzing differences...' });
      console.log('Finding differences...');
      const diffResults = findDifferences(image1Data.data, image2Data.data, image1Data.width, image1Data.height);
      
      results.annotations = {
        diffImageData: diffResults.diffImageData,
        differences: diffResults.differences
      };
      
      results.stats.mismatchedPixels = diffResults.mismatchedPixels;
      results.stats.differencesFound = diffResults.differences.length;
      results.stats.pixelDiffPercentage = (diffResults.mismatchedPixels / (image1Data.width * image1Data.height)) * 100;
    }
    
    // OCR - Simplified for now
    if (settings.enableOcr) {
      self.postMessage({ type: 'status', message: 'OCR analysis (simplified)...' });
      console.log('OCR requested - using simplified version');
      
      // For now, just return a placeholder
      results.ocr = {
        image1: 'OCR functionality coming soon - Tesseract.js integration pending',
        image2: 'OCR functionality coming soon - Tesseract.js integration pending'
      };
      
      // We'll implement full OCR later with proper Tesseract loading
    }
    
    // Object detection - Simplified for now
    if (settings.enableClassification) {
      self.postMessage({ type: 'status', message: 'Object detection (simplified)...' });
      console.log('Object detection requested - using simplified version');
      
      // For now, return basic analysis
      results.classification = {
        image1: [
          { className: 'Image Analysis', probability: 1.0, bbox: null },
          { className: `Dimensions: ${image1Data.width}x${image1Data.height}`, probability: 1.0, bbox: null }
        ],
        image2: [
          { className: 'Image Analysis', probability: 1.0, bbox: null },
          { className: `Dimensions: ${image2Data.width}x${image2Data.height}`, probability: 1.0, bbox: null }
        ]
      };
      
      // We'll implement full COCO-SSD later with proper TensorFlow loading
    }
    
    console.log('Analysis complete, sending results');
    // Send final results
    self.postMessage({ type: 'complete', results });
    
  } catch (error) {
    console.error('Comparison worker error:', error);
    self.postMessage({ 
      type: 'error', 
      error: error instanceof Error ? error.message : 'Unknown error occurred' 
    });
  }
});

// Log that worker is ready
console.log('Comparison worker initialized and ready');

// Prevent TypeScript error
export {}; 