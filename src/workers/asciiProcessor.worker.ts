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
  };
}

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
const getColorForMode = (r: number, g: number, b: number, mode: string): string => {
  switch(mode) {
    case 'mono':
      return '#ffffff';
    case 'matrix':
      const matrixColors = ['#00ff41', '#00dd31', '#00bb21', '#009911'];
      const brightness = (r + g + b) / 765;
      return matrixColors[Math.floor(brightness * (matrixColors.length - 1))];
    case 'cyberpunk':
      if (b > r && b > g) return '#00ffff';
      if (r > b) return '#ff00ff';
      return '#ff88ff';
    case 'retro':
      if (r > g && r > b) return '#ff6b1a';
      if (g > b) return '#ffd700';
      return '#ffaa66';
    case 'neon':
      if (b > r && b > g) return '#00fff0';
      if (r > g) return '#ff0099';
      return '#66ffff';
    case 'vaporwave':
      if (r > g && r > b) return '#ff71ce';
      if (b > r) return '#b967ff';
      return '#ffaadd';
    default:
      return '#ffffff';
  }
};

// Main processing function with improved performance
const processFrame = (request: ProcessingRequest) => {
  const { frameData, config } = request;
  const { width, height, pixels } = frameData;
  const { asciiChars, brightness, contrast, edgeDetection, edgeThreshold, negative, charDensity = 1.0 } = config;
  
  // Calculate optimal character dimensions based on input size and density
  const targetCharWidth = Math.floor(80 * charDensity);
  const charWidth = targetCharWidth;
  const charHeight = Math.ceil((height / width) * targetCharWidth * 0.5); // Adjust for character aspect ratio
  
  let asciiFrame = '';
  const colors: number[] = [];
  
  // Apply brightness and contrast adjustments
  const adjustedPixels = new Uint8ClampedArray(pixels.length);
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
    
    // Apply contrast
    r = ((r - 128) * contrast + 128);
    g = ((g - 128) * contrast + 128);
    b = ((b - 128) * contrast + 128);
    
    // Apply brightness
    r = r * brightness;
    g = g * brightness;
    b = b * brightness;
    
    // Clamp values
    adjustedPixels[i] = Math.max(0, Math.min(255, r));
    adjustedPixels[i + 1] = Math.max(0, Math.min(255, g));
    adjustedPixels[i + 2] = Math.max(0, Math.min(255, b));
    adjustedPixels[i + 3] = pixels[i + 3];
  }
  
  // Detect edges if needed
  let edges: Float32Array | null = null;
  if (edgeDetection) {
    edges = edgeDetector.detect(adjustedPixels, width, height);
  }
  
  // Generate ASCII art with improved sampling
  for (let y = 0; y < charHeight; y++) {
    for (let x = 0; x < charWidth; x++) {
      // Sample multiple pixels for better accuracy
      let totalBrightness = 0;
      let r = 0, g = 0, b = 0;
      let samples = 0;
      
      const startX = Math.floor(x * width / charWidth);
      const endX = Math.floor((x + 1) * width / charWidth);
      const startY = Math.floor(y * height / charHeight);
      const endY = Math.floor((y + 1) * height / charHeight);
      
      for (let sy = startY; sy < endY && sy < height; sy++) {
        for (let sx = startX; sx < endX && sx < width; sx++) {
          const idx = (sy * width + sx) * 4;
          
          if (edgeDetection && edges) {
            const edgeValue = edges[sy * width + sx] / 255;
            totalBrightness += edgeValue > edgeThreshold ? 1 : 0;
          } else {
            const pixelBrightness = (adjustedPixels[idx] + adjustedPixels[idx + 1] + adjustedPixels[idx + 2]) / 765;
            totalBrightness += pixelBrightness;
          }
          
          r += adjustedPixels[idx];
          g += adjustedPixels[idx + 1];
          b += adjustedPixels[idx + 2];
          samples++;
        }
      }
      
      if (samples > 0) {
        const avgBrightness = totalBrightness / samples;
        const charIndex = Math.floor(avgBrightness * (asciiChars.length - 1));
        asciiFrame += asciiChars[charIndex] || asciiChars[0];
        
        // Store average color for this character
        r = Math.floor(r / samples);
        g = Math.floor(g / samples);
        b = Math.floor(b / samples);
        colors.push(r, g, b);
      } else {
        asciiFrame += asciiChars[0];
        colors.push(0, 0, 0);
      }
    }
    asciiFrame += '\n';
  }
  
  // Send processed frame back with improved data structure
  self.postMessage({
    type: 'frameProcessed',
    data: {
      frameNumber: frameData.frameNumber,
      timestamp: frameData.timestamp,
      ascii: asciiFrame,
      colors: new Uint8ClampedArray(colors),
      width: charWidth,
      height: charHeight,
      processingTime: performance.now()
    }
  });
};

// Handle messages with error handling
self.onmessage = (e) => {
  try {
    if (e.data.type === 'processFrame') {
      processFrame(e.data.data);
    }
  } catch (error) {
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