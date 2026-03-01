// Environment configuration for the application
export const ENV = {
  // Enable Whisper/Transformers models with improved loading
  ENABLE_WHISPER_MODELS: true,
  
  // FFmpeg configuration
  FFMPEG_CORE_URL: '/ffmpeg/ffmpeg-core.js',
  FFMPEG_WASM_URL: '/ffmpeg/ffmpeg-core.wasm',
  
  // Model CDN configuration with fallbacks
  MODEL_CDN_URL: 'https://huggingface.co',
  MODEL_CDN_FALLBACK: 'https://cdn.jsdelivr.net/npm/@xenova/transformers',
  
  // ONNX Runtime configuration
  ORT_WASM_PATHS: '/ort-wasm/',
  
  // Feature flags
  FEATURES: {
    TRANSCRIPTION: true, // Re-enabled with fixes
    SIMPLE_POSITIONER: true,
    EXPORT_BURN: true,
    EXPORT_EMBED: true,
    HARDWARE_ACCELERATION: true,
    WEBCODECS_EXPORT: true,
  },
  
  // Model loading configuration
  MODEL_LOADING: {
    MAX_RETRIES: 3,
    RETRY_DELAY: 2000,
    TIMEOUT: 60000, // 60 seconds
    CACHE_MODELS: true,
    VALIDATE_WASM: true,
  }
};

// Check if we're in development mode
export const isDevelopment = import.meta.env.DEV;
export const isProduction = import.meta.env.PROD;

// Validate required environment variables
export function validateEnvironment() {
  // Check for required browser features
  const requiredFeatures = {
    'WebAssembly': typeof WebAssembly !== 'undefined',
    'SharedArrayBuffer': typeof SharedArrayBuffer !== 'undefined',
    'OffscreenCanvas': typeof OffscreenCanvas !== 'undefined',
  };
  
  const missingFeatures = Object.entries(requiredFeatures)
    .filter(([_, supported]) => !supported)
    .map(([feature]) => feature);
  
  if (missingFeatures.length > 0) {
    logger.warn('Missing browser features:', missingFeatures);
    
    // Disable features that require missing capabilities
    if (!requiredFeatures.SharedArrayBuffer) {
      ENV.FEATURES.HARDWARE_ACCELERATION = false;
      logger.warn('Hardware acceleration disabled due to missing SharedArrayBuffer');
    }
  }
  
  return true;
}

// Production-safe console logging
export const logger = {
  log: (...args: any[]) => {
    if (!isProduction) {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    console.error(...args);
    // In production, you might want to send to error tracking service
  },
  
  warn: (...args: any[]) => {
    if (!isProduction) {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (!isProduction) {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
  }
}; 