// ASCII Processor Web Worker
// Handles parallel frame processing with optimized algorithms

interface ProcessingRequest {
  frameData: {
    frameNumber: number;
    timestamp: number;
    width: number;
    height: number;
    pixels: Uint8ClampedArray;
  };
  config: {
    asciiChars: string;
    colorMode: string;
    brightness: number;
    contrast: number;
    edgeDetection: boolean;
    edgeThreshold: number;
    negative?: boolean;
    fontSize?: number;
    charDensity?: number;
    colored?: boolean;
  };
}

// Enhanced character sets for super detailed ASCII art
const DETAILED_CHAR_SETS = {
  ultra: ` .'"-_:,;^~=+<>iv%xclrs{*}I?!][1taeo7zjLunT#JCwfy325Fp6mqSghVd4EgXPGZbYkOA&8U$@KHDBWNMR0Q`,
  super: ` .':;!~+-xmo*#W&8@`,
  high: ` .:-=+*#%@`,
  medium: ` .:-+#@`,
  low: ` .#@`
};

// Performance monitoring
let lastPerformanceCheck = 0;
const PERFORMANCE_CHECK_INTERVAL = 1000; // Check every second

// Optimized Sobel edge detection
class EdgeDetector {
  private sobelX = [
    [-1, 0, 1],
    [-2, 0, 2],
    [-1, 0, 1]
  ];
  
  private sobelY = [
    [-1, -2, -1],
    [0, 0, 0],
    [1, 2, 1]
  ];

  detect(pixels: Uint8ClampedArray, width: number, height: number): Float32Array {
    const edges = new Float32Array(width * height);
    
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0, gy = 0;
        
        // Apply Sobel operators
        for (let i = -1; i <= 1; i++) {
          for (let j = -1; j <= 1; j++) {
            const idx = ((y + i) * width + (x + j)) * 4;
            const intensity = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
            
            gx += intensity * this.sobelX[i + 1][j + 1];
            gy += intensity * this.sobelY[i + 1][j + 1];
          }
        }
        
        // Calculate edge magnitude
        edges[y * width + x] = Math.sqrt(gx * gx + gy * gy);
      }
    }
    
    return edges;
  }
}

const edgeDetector = new EdgeDetector();

// Enhanced color processing functions
const getColorForMode = (r: number, g: number, b: number, mode: string): [number, number, number] => {
  switch(mode) {
    case 'mono':
      return [255, 255, 255];
    case 'matrix': {
      const brightness = (r + g + b) / 765;
      if (brightness > 0.75) return [0, 255, 65];
      if (brightness > 0.5) return [0, 221, 49];
      if (brightness > 0.25) return [0, 187, 33];
      return [0, 153, 17];
    }
    case 'cyberpunk':
      if (b > r && b > g) return [0, 255, 255];
      if (r > b) return [255, 0, 255];
      return [255, 136, 255];
    case 'retro':
      if (r > g && r > b) return [255, 107, 26];
      if (g > b) return [255, 215, 0];
      return [255, 170, 102];
    case 'neon':
      if (b > r && b > g) return [0, 255, 240];
      if (r > g) return [255, 0, 153];
      return [102, 255, 255];
    case 'vaporwave':
      if (r > g && r > b) return [255, 113, 206];
      if (b > r) return [185, 103, 255];
      return [255, 170, 221];
    default:
      return [255, 255, 255];
  }
};

// Enhanced color processing for true color support
const getRGBColor = (r: number, g: number, b: number): [number, number, number] => {
  return [r, g, b];
};

// Enhanced brightness calculation with better color perception
const calculateBrightness = (r: number, g: number, b: number): number => {
  // Using Rec. 709 luma coefficients for better perceptual accuracy
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Get enhanced character set based on density
const getCharacterSet = (charDensity: number, customChars?: string): string => {
  if (customChars) return customChars;
  
  if (charDensity >= 2.0) return DETAILED_CHAR_SETS.ultra;
  if (charDensity >= 1.5) return DETAILED_CHAR_SETS.super;
  if (charDensity >= 1.0) return DETAILED_CHAR_SETS.high;
  if (charDensity >= 0.5) return DETAILED_CHAR_SETS.medium;
  return DETAILED_CHAR_SETS.low;
};

// Main processing function with improved performance and color support
const processFrame = (request: ProcessingRequest) => {
  const startTime = performance.now();
  const { frameData, config } = request;
  const { width, height, pixels } = frameData;
  const { brightness, contrast, edgeDetection, edgeThreshold, negative, charDensity = 1.0, colored = false } = config;
  
  // Get appropriate character set
  const asciiChars = getCharacterSet(charDensity, config.asciiChars);
  
  // Calculate optimal character dimensions based on input size and density
  const baseWidth = 120; // Base width for high quality
  const targetCharWidth = Math.floor(baseWidth * charDensity);
  const charWidth = Math.min(targetCharWidth, 200); // Cap at 200 for performance
  const charHeight = Math.ceil((height / width) * charWidth * 0.5); // Adjust for character aspect ratio
  
  const asciiLines: string[] = [];
  const colorData: number[] = [];
  
  // Apply brightness and contrast adjustments
  const adjustedPixels = new Uint8ClampedArray(pixels.length);
  const contrastFactor = contrast;
  
  for (let i = 0; i < pixels.length; i += 4) {
    let r = pixels[i];
    let g = pixels[i + 1];
    let b = pixels[i + 2];
    
    // Apply negative filter if needed
    if (negative) {
      r = 255 - r;
      g = 255 - g;
      b = 255 - b;
    }
    
    // Apply contrast and brightness
    r = Math.max(0, Math.min(255, ((r - 128) * contrastFactor + 128) * brightness));
    g = Math.max(0, Math.min(255, ((g - 128) * contrastFactor + 128) * brightness));
    b = Math.max(0, Math.min(255, ((b - 128) * contrastFactor + 128) * brightness));
    
    adjustedPixels[i] = r;
    adjustedPixels[i + 1] = g;
    adjustedPixels[i + 2] = b;
    adjustedPixels[i + 3] = pixels[i + 3];
  }
  
  // Detect edges if needed
  let edges: Float32Array | null = null;
  if (edgeDetection) {
    edges = edgeDetector.detect(adjustedPixels, width, height);
  }
  
  // Generate ASCII art with improved sampling
  const blockWidth = width / charWidth;
  const blockHeight = height / charHeight;
  const numChars = asciiChars.length;
  
  // Process each character position
  for (let y = 0; y < charHeight; y++) {
    let line = '';
    
    for (let x = 0; x < charWidth; x++) {
      // Calculate block boundaries with sub-pixel accuracy
      const startX = Math.floor(x * blockWidth);
      const endX = Math.ceil((x + 1) * blockWidth);
      const startY = Math.floor(y * blockHeight);
      const endY = Math.ceil((y + 1) * blockHeight);
      
      let totalBrightness = 0;
      let totalR = 0, totalG = 0, totalB = 0;
      let samples = 0;
      
      // Sample pixels in block with better coverage
      for (let sy = startY; sy < endY && sy < height; sy++) {
        for (let sx = startX; sx < endX && sx < width; sx++) {
          const idx = (sy * width + sx) * 4;
          
          const r = adjustedPixels[idx];
          const g = adjustedPixels[idx + 1];
          const b = adjustedPixels[idx + 2];
          
          if (edgeDetection && edges) {
            const edgeValue = edges[sy * width + sx] / 255;
            totalBrightness += edgeValue > edgeThreshold ? 1 : 0;
          } else {
            const pixelBrightness = calculateBrightness(r, g, b) / 255;
            totalBrightness += pixelBrightness;
          }
          
          totalR += r;
          totalG += g;
          totalB += b;
          samples++;
        }
      }
      
      if (samples > 0) {
        const avgBrightness = totalBrightness / samples;
        // Use a smoother mapping function for better gradients
        const charIndex = Math.floor(avgBrightness * avgBrightness * (numChars - 1));
        const clampedIndex = Math.max(0, Math.min(numChars - 1, charIndex));
        line += asciiChars[clampedIndex];
        
        // Store color data for colored output
        if (colored || config.colorMode !== 'mono') {
          const avgR = Math.floor(totalR / samples);
          const avgG = Math.floor(totalG / samples);
          const avgB = Math.floor(totalB / samples);
          
          if (colored) {
            // For true color mode, use actual pixel colors
            colorData.push(avgR, avgG, avgB);
          } else {
            // For themed modes, apply color theme
            const [r, g, b] = getColorForMode(avgR, avgG, avgB, config.colorMode);
            colorData.push(r, g, b);
          }
        }
      } else {
        line += asciiChars[0];
        if (colored || config.colorMode !== 'mono') {
          colorData.push(0, 0, 0);
        }
      }
    }
    
    asciiLines.push(line);
  }
  
  const asciiFrame = asciiLines.join('\n');
  const processingTime = performance.now() - startTime;
  
  // Check performance periodically
  const now = performance.now();
  if (now - lastPerformanceCheck > PERFORMANCE_CHECK_INTERVAL) {
    lastPerformanceCheck = now;
    
    // Estimate CPU usage (rough approximation)
    const cpuUsage = Math.min(100, (processingTime / (1000 / 30)) * 100);
    
    // Estimate memory usage
    const memoryUsage = (colorData.length * 3 + asciiFrame.length * 2) / (1024 * 1024); // MB
    
    self.postMessage({
      type: 'performance',
      cpuUsage,
      memoryUsage
    });
  }
  
  // Send processed frame back with frame number for proper ordering
  self.postMessage({
    type: 'frameProcessed',
    data: {
      frameNumber: frameData.frameNumber,
      timestamp: frameData.timestamp,
      ascii: asciiFrame,
      colors: colored || config.colorMode !== 'mono' ? new Uint8ClampedArray(colorData) : null,
      width: charWidth,
      height: charHeight,
      processingTime
    }
  });
};

// Handle messages with error handling
self.onmessage = (e) => {
  try {
  if (e.data.type === 'processFrame') {
    processFrame(e.data.data);
    }
  } catch (error: any) {
    console.error('Worker error:', error);
    self.postMessage({
      type: 'error',
      data: {
        error: error.message,
        frameNumber: e.data?.data?.frameData?.frameNumber
      }
    });
  }
}; 