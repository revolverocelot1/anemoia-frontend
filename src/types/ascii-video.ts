// Types for ASCII Video Converter

export interface ProcessingConfig {
  // Core settings
  asciiChars: string;
  colorMode: 'mono' | 'rgb' | 'retro' | 'matrix' | 'cyberpunk';
  brightness: number;
  contrast: number;
  scale: number;
  aspectRatio: number;
  
  // Advanced settings
  edgeDetection: boolean;
  edgeThreshold: number;
  parallelWorkers: number;
  frameBufferSize: number;
  
  // Effects
  glowEffect: boolean;
  scanlines: boolean;
  chromaShift: boolean;
  flickerEffect: boolean;
}

export interface FrameData {
  frameNumber: number;
  timestamp: number;
  width: number;
  height: number;
  pixels: Uint8ClampedArray;
  processed?: string;
  cached?: boolean;
}

export interface ProcessingMetrics {
  fps: number;
  processedFrames: number;
  totalFrames: number;
  estimatedTime: number;
  cpuUsage: number;
  memoryUsage: number;
}

export interface ProcessedVideo {
  frames: string[];
  fps: number;
  width: number;
  height: number;
  duration: number;
}

export interface WorkerMessage {
  type: 'processFrame' | 'getMetrics' | 'frameProcessed' | 'metrics';
  data: any;
}

export interface ColorTheme {
  r: number;
  g: number;
  b: number;
} 