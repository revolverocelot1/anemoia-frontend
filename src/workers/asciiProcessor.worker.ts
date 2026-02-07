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
    depthMode?: boolean;
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
const PERFORMANCE_CHECK_INTERVAL = 1000;

// Color theme mapping - uses brightness-modulated theme colors for better output
const getColorForMode = (r: number, g: number, b: number, mode: string): [number, number, number] => {
  const luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  switch(mode) {
    case 'mono':
      return [255, 255, 255];
    case 'matrix': {
      const intensity = Math.max(0.15, luma);
      return [0, Math.round(255 * intensity), Math.round(65 * intensity)];
    }
    case 'cyberpunk': {
      const ratio = r / (b + 1);
      if (ratio > 1.2) return [Math.round(255 * luma), 0, Math.round(255 * luma)]; // magenta
      if (ratio < 0.8) return [0, Math.round(255 * luma), Math.round(255 * luma)]; // cyan
      return [Math.round(200 * luma), Math.round(100 * luma), Math.round(255 * luma)];
    }
    case 'retro': {
      const warmth = (r * 2 + g) / (b + r + g + 1);
      if (warmth > 1.5) return [Math.round(255 * luma), Math.round(107 * luma), Math.round(26 * luma)];
      return [Math.round(255 * luma), Math.round(215 * luma), 0];
    }
    case 'neon': {
      const hueShift = (r - b) / 255;
      if (hueShift > 0.2) return [Math.round(255 * luma), 0, Math.round(153 * luma)]; // pink
      if (hueShift < -0.2) return [0, Math.round(255 * luma), Math.round(240 * luma)]; // cyan
      return [Math.round(100 * luma), Math.round(255 * luma), Math.round(255 * luma)];
    }
    case 'vaporwave': {
      const blend = (r + b) / (g + 1);
      if (blend > 2) return [Math.round(255 * luma), Math.round(113 * luma), Math.round(206 * luma)];
      return [Math.round(185 * luma), Math.round(103 * luma), Math.round(255 * luma)];
    }
    default:
      return [255, 255, 255];
  }
};

// Perceptual brightness - Rec. 709 luma
const calculateBrightness = (r: number, g: number, b: number): number => {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

// Get character set based on density
const getCharacterSet = (charDensity: number, customChars?: string): string => {
  if (customChars) return customChars;
  if (charDensity >= 2.0) return DETAILED_CHAR_SETS.ultra;
  if (charDensity >= 1.5) return DETAILED_CHAR_SETS.super;
  if (charDensity >= 1.0) return DETAILED_CHAR_SETS.high;
  if (charDensity >= 0.5) return DETAILED_CHAR_SETS.medium;
  return DETAILED_CHAR_SETS.low;
};

// Compute depth estimation for a block using gradient magnitude + local contrast
// Returns a value 0..1 where 0 = far (background) and 1 = near (foreground)
const computeBlockDepth = (
  pixels: Uint8ClampedArray, width: number, height: number,
  blockStartX: number, blockEndX: number, blockStartY: number, blockEndY: number
): number => {
  let maxGradient = 0;
  let sumBright = 0;
  let sumSq = 0;
  let n = 0;
  
  const step = Math.max(1, Math.floor(Math.max(blockEndX - blockStartX, blockEndY - blockStartY) / 4));
  
  for (let sy = blockStartY + 1; sy < blockEndY - 1; sy += step) {
    for (let sx = blockStartX + 1; sx < blockEndX - 1; sx += step) {
      const idx = (sy * width + sx) * 4;
      const bright = (pixels[idx] * 0.299 + pixels[idx + 1] * 0.587 + pixels[idx + 2] * 0.114) / 255;
      
      sumBright += bright;
      sumSq += bright * bright;
      n++;
      
      // Sobel gradient magnitude (horizontal + vertical)
      const idxL = (sy * width + (sx - 1)) * 4;
      const idxR = (sy * width + (sx + 1)) * 4;
      const idxU = ((sy - 1) * width + sx) * 4;
      const idxD = ((sy + 1) * width + sx) * 4;
      
      const lum = (i: number) => (pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
      const gx = lum(idxR) - lum(idxL);
      const gy = lum(idxD) - lum(idxU);
      const grad = Math.sqrt(gx * gx + gy * gy) / 255;
      
      if (grad > maxGradient) maxGradient = grad;
    }
  }
  
  if (n < 1) return 0;
  
  const meanBright = sumBright / n;
  const variance = Math.max(0, (sumSq / n) - (meanBright * meanBright));
  const contrast = Math.sqrt(variance);
  
  // Depth heuristic: combine edge strength, contrast, and brightness
  // Strong edges + high contrast + brightness = foreground (CLOSE)
  // Smooth + low contrast + dark = background (FAR)
  const edgeScore = Math.min(1, maxGradient * 4);    // Edge presence = closer
  const contrastScore = Math.min(1, contrast * 5);    // High local contrast = closer
  const brightScore = meanBright;                      // Brighter = closer
  
  // Weighted combination — edges are strongest depth cue
  const rawDepth = edgeScore * 0.5 + contrastScore * 0.3 + brightScore * 0.2;
  
  // Apply S-curve for more dramatic separation between near/far
  const sCurve = 1 / (1 + Math.exp(-8 * (rawDepth - 0.35)));
  
  return sCurve;
};

// Main processing function
const processFrame = (request: ProcessingRequest) => {
  const startTime = performance.now();
  const { frameData, config } = request;
  const { width, height, pixels } = frameData;
  const { brightness, contrast, edgeDetection, edgeThreshold, negative, charDensity = 1.0, colored = false, depthMode = false } = config;
  
  const asciiChars = getCharacterSet(charDensity, config.asciiChars);
  
  // Calculate output character grid dimensions
  const aspectRatio = 2.0; // Characters are ~2x taller than wide
  const targetWidth = Math.floor(80 * charDensity);
  const charWidth = Math.min(targetWidth, 120);
  const charHeight = Math.ceil(charWidth * (height / width) / aspectRatio);
  
  const asciiLines: string[] = [];
  const colorData: number[] = [];
  
  const contrastFactor = contrast;
  const brightnessMultiplier = brightness;
  const needsAdjustment = brightness !== 1.0 || contrast !== 1.0 || negative;
  
  // Block dimensions for mapping pixels to characters
  const blockWidth = width / charWidth;
  const blockHeight = height / charHeight;
  const numChars = asciiChars.length;
  const numCharsMinusOne = numChars - 1;
  
  // Sampling step - adaptive based on block size (smaller = more accurate but slower)
  const sampleStep = Math.max(1, Math.floor(Math.min(blockWidth, blockHeight) / 3));
  
  // Process each character position
  for (let y = 0; y < charHeight; y++) {
    let line = '';
    
    for (let x = 0; x < charWidth; x++) {
      const blockStartX = Math.floor(x * blockWidth);
      const blockEndX = Math.min(Math.floor((x + 1) * blockWidth), width);
      const blockStartY = Math.floor(y * blockHeight);
      const blockEndY = Math.min(Math.floor((y + 1) * blockHeight), height);
      
      let totalBrightness = 0;
      let totalR = 0, totalG = 0, totalB = 0;
      let samples = 0;
      
      for (let sy = blockStartY; sy < blockEndY; sy += sampleStep) {
        for (let sx = blockStartX; sx < blockEndX; sx += sampleStep) {
          const idx = (sy * width + sx) * 4;
          
          let r = pixels[idx];
          let g = pixels[idx + 1];
          let b = pixels[idx + 2];
          
          if (needsAdjustment) {
            if (negative) { r = 255 - r; g = 255 - g; b = 255 - b; }
            if (contrast !== 1.0 || brightness !== 1.0) {
              r = Math.max(0, Math.min(255, ((r - 128) * contrastFactor + 128) * brightnessMultiplier));
              g = Math.max(0, Math.min(255, ((g - 128) * contrastFactor + 128) * brightnessMultiplier));
              b = Math.max(0, Math.min(255, ((b - 128) * contrastFactor + 128) * brightnessMultiplier));
            }
          }
          
          const pixelBrightness = calculateBrightness(r, g, b) / 255;
          totalBrightness += pixelBrightness;
          totalR += r;
          totalG += g;
          totalB += b;
          samples++;
        }
      }
      
      if (samples > 0) {
        let avgBrightness = totalBrightness / samples;
        
        // Depth mode: near objects = dense heavy chars, far objects = sparse light chars
        // Creates a 3D-space illusion where depth is visible through character density
        if (depthMode) {
          const depth = computeBlockDepth(pixels, width, height, blockStartX, blockEndX, blockStartY, blockEndY);
          // depth 0 = FAR (background) → very sparse chars (spaces, dots)
          // depth 1 = NEAR (foreground) → dense heavy chars (@, #, %)
          avgBrightness = depth;
        }
        
        // Character mapping
        const charIndex = depthMode
          ? Math.min(numCharsMinusOne, Math.floor(avgBrightness * numChars)) // Linear for depth (full range separation)
          : Math.min(numCharsMinusOne, Math.floor(Math.pow(avgBrightness, 0.65) * numChars)); // Gamma-corrected for normal
        line += asciiChars[charIndex];
        
        // Color data
        const avgR = Math.round(totalR / samples);
        const avgG = Math.round(totalG / samples);
        const avgB = Math.round(totalB / samples);
        
        if (colored) {
          // Full Color mode - boost saturation slightly for better visual accuracy
          const maxC = Math.max(avgR, avgG, avgB);
          const minC = Math.min(avgR, avgG, avgB);
          const satBoost = 1.15; // Slight saturation boost
          const mid = (maxC + minC) / 2;
          
          const boostedR = Math.min(255, Math.round(mid + (avgR - mid) * satBoost));
          const boostedG = Math.min(255, Math.round(mid + (avgG - mid) * satBoost));
          const boostedB = Math.min(255, Math.round(mid + (avgB - mid) * satBoost));
          
          colorData.push(boostedR, boostedG, boostedB);
        } else if (config.colorMode !== 'mono') {
          // Themed color mode
          const [r, g, b] = getColorForMode(avgR, avgG, avgB, config.colorMode);
          colorData.push(r, g, b);
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
  
  // Periodic performance reporting
  const now = performance.now();
  if (now - lastPerformanceCheck > PERFORMANCE_CHECK_INTERVAL) {
    lastPerformanceCheck = now;
    const cpuUsage = Math.min(100, (processingTime / (1000 / 30)) * 100);
    const memoryUsage = (colorData.length * 3 + asciiFrame.length * 2) / (1024 * 1024);
    self.postMessage({ type: 'performance', cpuUsage, memoryUsage });
  }
  
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

// Handle messages
self.onmessage = (e) => {
  try {
    if (e.data.type === 'processFrame') {
      processFrame(e.data.data);
    }
  } catch (error: any) {
    console.error('Worker error:', error);
    self.postMessage({
      type: 'error',
      data: { error: error.message, frameNumber: e.data?.data?.frameData?.frameNumber }
    });
  }
};
