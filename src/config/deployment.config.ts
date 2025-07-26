// Deployment Configuration
// This file ensures consistent behavior across different deployment environments

export const getDeploymentConfig = () => {
  const hostname = window.location.hostname;
  const isProduction = hostname !== 'localhost' && hostname !== '127.0.0.1';
  const isRender = hostname.includes('onrender.com');
  const isVercel = hostname.includes('vercel.app');
  const isNetlify = hostname.includes('netlify.app');
  
  return {
    // Environment flags
    isProduction,
    isDevelopment: !isProduction,
    isRender,
    isVercel,
    isNetlify,
    
    // API endpoints with fallbacks
    apiUrl: import.meta.env.VITE_API_URL || (
      isProduction 
        ? 'https://anemoia-api.onrender.com/api'
        : 'http://localhost:3000/api'
    ),
    
    // Supabase configuration
    supabaseUrl: import.meta.env.VITE_SUPABASE_URL || 'https://qvqxkgescavccwgwttsp.supabase.co',
    supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InF2cXhrZ2VzY2F2Y2N3Z3d0dHNwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE2NDI2NDAsImV4cCI6MjA2NzIxODY0MH0.yAZu_fJdEzfyFYKrJnGECrjyTaJ6fW1xvZbOXdKrKfg',
    
    // Asset paths with CDN fallbacks
    assetBasePath: import.meta.env.BASE_URL || '/',
    publicPath: isProduction ? '/' : '/',
    
    // Performance optimizations for production
    enableServiceWorker: isProduction,
    enablePrefetch: isProduction,
    enableLazyLoading: true,
    
    // GPU/WebGL settings optimized for different platforms
    webglSettings: {
      // Render has limited GPU resources
      maxTextureSize: isRender ? 2048 : 4096,
      preferWebGL2: true,
      antialias: !isRender, // Disable antialiasing on Render to save resources
      powerPreference: isRender ? 'low-power' : 'high-performance',
      failIfMajorPerformanceCaveat: false, // Don't fail on low-end GPUs
    },
    
    // Model loading settings
    modelLoading: {
      // Use smaller chunk sizes on Render to avoid timeouts
      chunkSize: isRender ? 512 * 1024 : 2 * 1024 * 1024, // 512KB vs 2MB
      timeout: isRender ? 60000 : 30000, // 60s vs 30s timeout
      maxRetries: 3,
      retryDelay: 1000,
    },
    
    // Feature flags for different environments
    features: {
      enableGaussianSplatting: true,
      enableTriangleSplatting: true,
      enableFaceSwap: !isRender, // Disable heavy features on Render
      enableVideoExport: !isRender,
      enableWebRTC: !isRender,
      maxUploadSize: isRender ? 50 * 1024 * 1024 : 100 * 1024 * 1024, // 50MB vs 100MB
    },
    
    // Error tracking
    enableErrorTracking: isProduction,
    sentryDsn: isProduction ? import.meta.env.VITE_SENTRY_DSN_FRONTEND : undefined,
    
    // Analytics
    enableAnalytics: isProduction,
    gaTrackingId: import.meta.env.VITE_GA_TRACKING_ID,
  };
};

// Helper to check if a feature is available
export const isFeatureEnabled = (feature: keyof ReturnType<typeof getDeploymentConfig>['features']) => {
  const config = getDeploymentConfig();
  return config.features[feature];
};

// Helper to get optimized WebGL context attributes
export const getWebGLContextAttributes = () => {
  const config = getDeploymentConfig();
  return {
    alpha: true,
    antialias: config.webglSettings.antialias,
    depth: true,
    stencil: false,
    premultipliedAlpha: true,
    preserveDrawingBuffer: false,
    powerPreference: config.webglSettings.powerPreference as WebGLPowerPreference,
    failIfMajorPerformanceCaveat: config.webglSettings.failIfMajorPerformanceCaveat,
  };
}; 