// GPU Utilities for forcing high-performance GPU usage

export interface GPUInfo {
  tier: number;
  type: string;
  fps?: number;
  device?: string;
  renderer?: string;
  webGLVersion?: number;
  webGLSupported: boolean;
  webGLContext?: string;
  maxTextureSize?: number;
  vendor?: string;
  unmaskedVendor?: string;
  unmaskedRenderer?: string;
}

export class GPUManager {
  private static instance: GPUManager;
  private gpuInfo: GPUInfo | null = null;
  private detectionPromise: Promise<GPUInfo> | null = null;

  private constructor() {}

  static getInstance(): GPUManager {
    if (!GPUManager.instance) {
      GPUManager.instance = new GPUManager();
    }
    return GPUManager.instance;
  }

  async getGPUInfo(): Promise<GPUInfo> {
    if (this.gpuInfo) {
      return this.gpuInfo;
    }

    if (this.detectionPromise) {
      return this.detectionPromise;
    }

    this.detectionPromise = this.detectGPUInfo();
    this.gpuInfo = await this.detectionPromise;
    return this.gpuInfo;
  }

  private async detectGPUInfo(): Promise<GPUInfo> {
    return detectGPU();
  }

  isHighPerformanceGPU(): boolean {
    if (!this.gpuInfo) return false;
    
    const renderer = (this.gpuInfo.unmaskedRenderer || this.gpuInfo.renderer || '').toLowerCase();
    return renderer.includes('nvidia') || 
           renderer.includes('geforce') || 
           renderer.includes('radeon') ||
           (renderer.includes('amd') && !renderer.includes('integrated'));
  }

  getRecommendedSettings() {
    if (!this.gpuInfo) {
      return {
        enableShadows: false,
        enablePostProcessing: false,
        enableReflections: false,
        pixelRatio: 1,
        antialiasing: false,
      };
    }

    const isHighEnd = this.isHighPerformanceGPU();
    const gpuTier = this.gpuInfo.tier || 1;

    return {
      enableShadows: isHighEnd && gpuTier >= 2,
      enablePostProcessing: isHighEnd && gpuTier >= 3,
      enableReflections: isHighEnd && gpuTier >= 3,
      pixelRatio: Math.min(window.devicePixelRatio, isHighEnd ? 2 : 1),
      antialiasing: isHighEnd && gpuTier >= 2,
    };
  }

  // Detect GPU information from WebGL context
  async detectGPU(gl: WebGLRenderingContext | WebGL2RenderingContext): Promise<GPUInfo> {
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    
    if (!debugInfo) {
      console.warn('WEBGL_debug_renderer_info not available');
      return this.getDefaultGPUInfo();
    }

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';

    const isNvidia = /nvidia/i.test(vendor) || /nvidia/i.test(renderer) || /geforce/i.test(renderer);
    const isAMD = /amd/i.test(vendor) || /amd/i.test(renderer) || /radeon/i.test(renderer);
    const isIntel = /intel/i.test(vendor) || /intel/i.test(renderer);

    // Determine tier and type based on GPU
    let tier = 1;
    let type = 'integrated';
    
    if (isNvidia || (isAMD && !renderer.toLowerCase().includes('integrated'))) {
      tier = 3;
      type = 'discrete';
    } else if (isIntel) {
      tier = 1;
      type = 'integrated';
    }

    this.gpuInfo = {
      tier,
      type,
      vendor,
      renderer,
      unmaskedVendor: vendor,
      unmaskedRenderer: renderer,
      webGLSupported: true,
      webGLVersion: gl instanceof WebGL2RenderingContext ? 2 : 1,
      webGLContext: gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl',
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)
    };

    console.log('GPU Detected:', this.gpuInfo);
    return this.gpuInfo;
  }

  // Force Chrome/Edge to use high-performance GPU
  forceHighPerformanceGPU(): void {
    // Add meta tag for GPU preference
    const metaGPU = document.createElement('meta');
    metaGPU.httpEquiv = 'X-UA-Compatible';
    metaGPU.content = 'IE=edge,chrome=1';
    document.head.appendChild(metaGPU);

    // Force hardware acceleration CSS
    document.body.style.transform = 'translateZ(0)';
    document.body.style.willChange = 'transform';

    // Add GPU acceleration hints to root element
    const root = document.documentElement;
    root.style.setProperty('--gpu-acceleration', 'true');
    root.style.transform = 'translate3d(0,0,0)';
    root.style.backfaceVisibility = 'hidden';
    root.style.perspective = '1000px';
  }

  // Get WebGL context with forced GPU settings
  getWebGLContext(canvas: HTMLCanvasElement, webgl2: boolean = true): WebGLRenderingContext | WebGL2RenderingContext | null {
    const contextAttributes: WebGLContextAttributes = {
      alpha: true,
      antialias: true,
      depth: true,
      stencil: false,
      premultipliedAlpha: true,
      preserveDrawingBuffer: false,
      powerPreference: 'high-performance',
      failIfMajorPerformanceCaveat: false,
      desynchronized: true
    };

    let context: WebGLRenderingContext | WebGL2RenderingContext | null = null;

    if (webgl2) {
      context = canvas.getContext('webgl2', contextAttributes) as WebGL2RenderingContext;
    }

    if (!context) {
      context = canvas.getContext('webgl', contextAttributes) as WebGLRenderingContext;
    }

    if (!context) {
      context = canvas.getContext('experimental-webgl', contextAttributes) as WebGLRenderingContext;
    }

    if (context) {
      // Enable GPU-specific extensions
      this.enableGPUExtensions(context);
    }

    return context;
  }

  // Enable GPU-specific WebGL extensions
  private enableGPUExtensions(gl: WebGLRenderingContext | WebGL2RenderingContext): void {
    // Common performance extensions
    const extensions = [
      'EXT_texture_filter_anisotropic',
      'OES_texture_float_linear',
      'OES_texture_half_float_linear',
      'WEBGL_compressed_texture_s3tc',
      'WEBGL_compressed_texture_pvrtc',
      'WEBGL_compressed_texture_etc1',
      'ANGLE_instanced_arrays',
      'OES_element_index_uint',
      'OES_standard_derivatives',
      'EXT_shader_texture_lod',
      'EXT_frag_depth'
    ];

    extensions.forEach(ext => {
      try {
        const extension = gl.getExtension(ext);
        if (extension) {
          console.log(`Enabled WebGL extension: ${ext}`);
        }
      } catch (e) {
        console.warn(`Failed to enable extension: ${ext}`);
      }
    });
  }

  // Check WebGPU availability and capabilities
  async checkWebGPU(): Promise<boolean> {
    if (!('gpu' in navigator)) {
      console.warn('WebGPU not supported in this browser');
      return false;
    }

    try {
      const adapter = await navigator.gpu.requestAdapter({
        powerPreference: 'high-performance'
      });

      if (!adapter) {
        console.warn('No WebGPU adapter found');
        return false;
      }

      const device = await adapter.requestDevice();
      console.log('WebGPU device acquired:', device);

      // Log adapter info if available (not all browsers support this yet)
      if ('requestAdapterInfo' in adapter && typeof adapter.requestAdapterInfo === 'function') {
        try {
          const info = await adapter.requestAdapterInfo();
          console.log('WebGPU Adapter Info:', info);
        } catch (e) {
          console.log('WebGPU Adapter Info not available');
        }
      } else {
        console.log('WebGPU Adapter Info not supported in this browser');
      }

      return true;
    } catch (error) {
      console.error('WebGPU initialization failed:', error);
      return false;
    }
  }

  // Get GPU memory info (Chrome only)
  getGPUMemoryInfo(): any {
    const gl = document.createElement('canvas').getContext('webgl');
    if (!gl) return null;

    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    if (!ext) return null;

    // Chrome specific
    const memory = (performance as any).memory;
    if (memory) {
      return {
        totalJSHeapSize: memory.totalJSHeapSize,
        usedJSHeapSize: memory.usedJSHeapSize,
        jsHeapSizeLimit: memory.jsHeapSizeLimit
      };
    }

    return null;
  }

  private getDefaultGPUInfo(): GPUInfo {
    return {
      tier: 1,
      type: 'integrated',
      vendor: 'Unknown',
      renderer: 'Unknown',
      webGLSupported: false,
      webGLVersion: 0,
      webGLContext: 'none'
    };
  }

  async logGPUInfo() {
    const info = await this.getGPUInfo();
    console.group('GPU Information');
    console.log('Vendor:', info.vendor);
    console.log('Renderer:', info.renderer);
    console.log('Tier:', info.tier);
    console.log('Type:', info.type);
    console.log('WebGL Version:', info.webGLVersion);
    console.log('WebGL Supported:', info.webGLSupported);
    console.log('Max Texture Size:', info.maxTextureSize);
    console.log('Recommended Settings:', this.getRecommendedSettings());
    console.groupEnd();
  }
}

// Initialize GPU manager and force high-performance mode
export const initializeGPU = async (): Promise<void> => {
  const gpuManager = GPUManager.getInstance();
  
  // Force high-performance GPU
  gpuManager.forceHighPerformanceGPU();
  
  // Check WebGPU support
  const webgpuSupported = await gpuManager.checkWebGPU();
  console.log('WebGPU supported:', webgpuSupported);
  
  // Create temporary canvas to detect GPU
  const canvas = document.createElement('canvas');
  const gl = gpuManager.getWebGLContext(canvas);
  
  if (gl) {
    await gpuManager.detectGPU(gl);
  }
  
  // Log memory info
  const memoryInfo = gpuManager.getGPUMemoryInfo();
  if (memoryInfo) {
    console.log('GPU Memory Info:', memoryInfo);
  }
};

// Export singleton instance
export const gpuManager = GPUManager.getInstance();

export const detectGPU = async (): Promise<GPUInfo> => {
  console.log('Starting GPU detection...');
  
  // First check basic WebGL support
  const canvas = document.createElement('canvas');
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  let webGLVersion = 0;
  let webGLContext = 'none';
  
  try {
    // Try WebGL2 first
    gl = canvas.getContext('webgl2') as WebGL2RenderingContext;
    if (gl) {
      webGLVersion = 2;
      webGLContext = 'webgl2';
    } else {
      // Fall back to WebGL1
      gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl') as WebGLRenderingContext;
      if (gl) {
        webGLVersion = 1;
        webGLContext = 'webgl';
      }
    }
  } catch (e) {
    console.error('WebGL context creation failed:', e);
  }
  
  if (!gl) {
    console.error('WebGL not supported');
    return {
      tier: 0,
      type: 'unknown',
      webGLSupported: false,
      webGLVersion: 0,
      webGLContext: 'none'
    };
  }
  
  // Get basic WebGL info
  const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
  const vendor = gl.getParameter(gl.VENDOR);
  const renderer = gl.getParameter(gl.RENDERER);
  const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
  
  let unmaskedVendor = vendor;
  let unmaskedRenderer = renderer;
  
  if (debugInfo) {
    unmaskedVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
    unmaskedRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
  }
  
  console.log('WebGL Info:', {
    webGLVersion,
    webGLContext,
    vendor,
    renderer,
    unmaskedVendor,
    unmaskedRenderer,
    maxTextureSize,
    extensions: gl.getSupportedExtensions()
  });
  
  // Try to detect with GPU.js if available
  try {
    const { getGPUTier } = await import('detect-gpu');
    const gpuTier = await getGPUTier();
    
    console.log('GPU Tier Detection:', gpuTier);
    
    return {
      tier: gpuTier.tier,
      type: gpuTier.type || 'unknown',
      fps: gpuTier.fps,
      device: gpuTier.device,
      renderer: gpuTier.gpu,
      webGLSupported: true,
      webGLVersion,
      webGLContext,
      maxTextureSize,
      vendor,
      unmaskedVendor,
      unmaskedRenderer
    };
  } catch (error) {
    console.warn('GPU tier detection failed, using fallback:', error);
    
    // Fallback detection based on renderer string
    let tier = 1;
    let type = 'integrated';
    
    const rendererLower = (unmaskedRenderer || renderer || '').toLowerCase();
    
    if (rendererLower.includes('nvidia') || rendererLower.includes('geforce')) {
      tier = 3;
      type = 'discrete';
    } else if (rendererLower.includes('radeon') || rendererLower.includes('amd')) {
      tier = 3;
      type = 'discrete';
    } else if (rendererLower.includes('intel')) {
      tier = 1;
      type = 'integrated';
    } else if (rendererLower.includes('mali') || rendererLower.includes('adreno')) {
      tier = 1;
      type = 'mobile';
    }
    
    return {
      tier,
      type,
      webGLSupported: true,
      webGLVersion,
      webGLContext,
      maxTextureSize,
      vendor,
      renderer: unmaskedRenderer || renderer,
      unmaskedVendor,
      unmaskedRenderer
    };
  }
};

export const isLowEndDevice = (gpuInfo: GPUInfo): boolean => {
  console.log('Checking if low-end device:', {
    tier: gpuInfo.tier,
    type: gpuInfo.type,
    webGLVersion: gpuInfo.webGLVersion
  });
  
  // More lenient for deployment environments
  const isLowEnd = gpuInfo.tier === 0 || 
    (gpuInfo.tier === 1 && gpuInfo.type === 'mobile') ||
    !gpuInfo.webGLSupported ||
    (gpuInfo.maxTextureSize !== undefined && gpuInfo.maxTextureSize < 4096);
    
  console.log('Is low-end device:', isLowEnd);
  return isLowEnd;
};

// Log deployment environment info
export const logDeploymentInfo = () => {
  const info = {
    userAgent: navigator.userAgent,
    platform: navigator.platform,
    vendor: navigator.vendor,
    language: navigator.language,
    onLine: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as any).deviceMemory,
    connection: (navigator as any).connection,
    isRender: window.location.hostname.includes('onrender.com'),
    isLocalhost: window.location.hostname === 'localhost',
    protocol: window.location.protocol,
    hostname: window.location.hostname,
    screenResolution: `${window.screen.width}x${window.screen.height}`,
    windowSize: `${window.innerWidth}x${window.innerHeight}`,
    pixelRatio: window.devicePixelRatio
  };
  
  console.log('Deployment Environment:', info);
  return info;
}; 