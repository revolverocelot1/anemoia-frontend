// GPU Utilities for forcing high-performance GPU usage

export interface GPUInfo {
  vendor: string;
  renderer: string;
  isNvidia: boolean;
  isAMD: boolean;
  isIntel: boolean;
  powerPreference: 'high-performance' | 'low-power' | 'default';
}

export class GPUManager {
  private static instance: GPUManager;
  private gpuInfo: GPUInfo | null = null;

  private constructor() {}

  static getInstance(): GPUManager {
    if (!GPUManager.instance) {
      GPUManager.instance = new GPUManager();
    }
    return GPUManager.instance;
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

    // Force high-performance for dedicated GPUs
    const powerPreference = (isNvidia || isAMD) ? 'high-performance' : 'default';

    this.gpuInfo = {
      vendor,
      renderer,
      isNvidia,
      isAMD,
      isIntel,
      powerPreference
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

      // Log adapter info
      const info = await adapter.requestAdapterInfo();
      console.log('WebGPU Adapter Info:', info);

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
      vendor: 'Unknown',
      renderer: 'Unknown',
      isNvidia: false,
      isAMD: false,
      isIntel: false,
      powerPreference: 'default'
    };
  }

  getGPUInfo(): GPUInfo | null {
    return this.gpuInfo;
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