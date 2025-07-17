/**
 * Network configuration for model downloads and CDN endpoints
 */

export const NETWORK_CONFIG = {
  // Primary and fallback CDN endpoints for Hugging Face models
  cdnEndpoints: [
    'https://huggingface.co/',
    'https://cdn-lfs.huggingface.co/',
    'https://cdn-lfs-us-1.huggingface.co/'
  ],
  
  // Retry configuration
  retry: {
    maxAttempts: 3,
    delayMs: 2000,
    backoffMultiplier: 1.5
  },
  
  // Timeout settings
  timeouts: {
    modelDownload: 300000, // 5 minutes
    modelLoad: 180000,     // 3 minutes
    transcription: 600000  // 10 minutes
  },
  
  // CORS proxy endpoints (if needed in future)
  corsProxies: [
    // Add CORS proxy URLs here if needed
  ],
  
  // Alternative model sources
  alternativeModelSources: {
    'whisper-tiny': [
      'onnx-community/whisper-tiny',
      'openai/whisper-tiny'
    ],
    'whisper-base': [
      'onnx-community/whisper-base',
      'openai/whisper-base'
    ],
    'whisper-small': [
      'onnx-community/whisper-small',
      'openai/whisper-small'
    ]
  },
  
  // Headers for better compatibility
  requestHeaders: {
    'Accept': 'application/json, application/octet-stream, */*',
    'Cache-Control': 'no-cache'
  }
};

/**
 * Get the best available CDN endpoint
 */
export async function getBestCDNEndpoint(): Promise<string> {
  for (const endpoint of NETWORK_CONFIG.cdnEndpoints) {
    try {
      const response = await fetch(endpoint, {
        method: 'HEAD',
        signal: AbortSignal.timeout(5000)
      });
      
      if (response.ok) {
        console.log(`[NetworkConfig] Using CDN endpoint: ${endpoint}`);
        return endpoint;
      }
    } catch (error) {
      console.warn(`[NetworkConfig] Endpoint ${endpoint} failed:`, error);
    }
  }
  
  // Return primary endpoint as fallback
  return NETWORK_CONFIG.cdnEndpoints[0];
}

/**
 * Retry helper function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options = NETWORK_CONFIG.retry
): Promise<T> {
  let lastError: Error | null = null;
  
  for (let attempt = 0; attempt < options.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      console.warn(`[NetworkConfig] Attempt ${attempt + 1} failed:`, error.message);
      
      if (attempt < options.maxAttempts - 1) {
        const delay = options.delayMs * Math.pow(options.backoffMultiplier, attempt);
        console.log(`[NetworkConfig] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError || new Error('All retry attempts failed');
} 