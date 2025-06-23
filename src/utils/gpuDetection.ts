/**
 * GPU Detection and Management Utility
 * Detects available GPU hardware and determines the best acceleration backend
 */

export interface GPUInfo {
  vendor: string;
  renderer: string;
  type: 'nvidia' | 'amd' | 'intel' | 'apple' | 'unknown';
  isDiscrete: boolean;
  backend: 'webgpu' | 'webgl' | 'cpu';
  tier: 'high' | 'medium' | 'low';
  features: {
    webgpu: boolean;
    webgl2: boolean;
    webgl: boolean;
    fp16: boolean;
    simd: boolean;
  };
}

export class GPUDetector {
  private static instance: GPUDetector;
  private gpuInfo: GPUInfo | null = null;
  
  static getInstance(): GPUDetector {
    if (!GPUDetector.instance) {
      GPUDetector.instance = new GPUDetector();
    }
    return GPUDetector.instance;
  }

  async detectGPU(): Promise<GPUInfo> {
    if (this.gpuInfo) return this.gpuInfo;

    // Initialize default info
    this.gpuInfo = {
      vendor: 'Unknown',
      renderer: 'Unknown',
      type: 'unknown',
      isDiscrete: false,
      backend: 'cpu',
      tier: 'low',
      features: {
        webgpu: false,
        webgl2: false,
        webgl: false,
        fp16: false,
        simd: 'WebAssembly' in window && 'instantiateStreaming' in WebAssembly
      }
    };

    // Check for WebGPU support first (best performance)
    if (await this.checkWebGPU()) {
      this.gpuInfo.features.webgpu = true;
      this.gpuInfo.backend = 'webgpu';
    }

    // Check WebGL for detailed GPU info
    const glInfo = await this.getWebGLInfo();
    if (glInfo) {
      this.gpuInfo.vendor = glInfo.vendor;
      this.gpuInfo.renderer = glInfo.renderer;
      this.gpuInfo.type = this.determineGPUType(glInfo.vendor, glInfo.renderer);
      this.gpuInfo.isDiscrete = this.isDiscreteGPU(glInfo.vendor, glInfo.renderer);
      this.gpuInfo.tier = this.determineGPUTier(glInfo.renderer, this.gpuInfo.isDiscrete);
      
      if (!this.gpuInfo.features.webgpu) {
        if (glInfo.version === 2) {
          this.gpuInfo.features.webgl2 = true;
          this.gpuInfo.backend = 'webgl';
        } else if (glInfo.version === 1) {
          this.gpuInfo.features.webgl = true;
          this.gpuInfo.backend = 'webgl';
        }
      }

      // Check for fp16 support
      this.gpuInfo.features.fp16 = await this.checkFP16Support();
    }

    // Log detection results
    console.log('🎮 GPU Detection Complete:', this.gpuInfo);
    
    // Show warning for integrated graphics
    if (!this.gpuInfo.isDiscrete && this.gpuInfo.type !== 'apple') {
      this.showGPUWarning();
    }

    return this.gpuInfo;
  }

  private async checkWebGPU(): Promise<boolean> {
    if (!('gpu' in navigator)) return false;

    try {
      const adapter = await (navigator as any).gpu.requestAdapter({
        powerPreference: 'high-performance',
        forceFallbackAdapter: false
      });

      if (adapter) {
        const info = await adapter.requestAdapterInfo();
        console.log('🚀 WebGPU Adapter Info:', info);
        
        // Prefer discrete GPUs
        const vendor = info?.vendor?.toLowerCase() || '';
        const description = info?.description?.toLowerCase() || '';
        
        if (vendor.includes('nvidia') || vendor.includes('amd') || 
            description.includes('nvidia') || description.includes('amd') ||
            description.includes('radeon') || description.includes('geforce')) {
          console.log('✅ WebGPU: Using discrete GPU');
          return true;
        }
        
        // Apple Silicon is good too
        if (vendor.includes('apple')) {
          console.log('✅ WebGPU: Using Apple Silicon GPU');
          return true;
        }

        // Avoid Intel integrated graphics with WebGPU
        if (vendor.includes('intel') || description.includes('intel')) {
          console.log('⚠️ WebGPU: Intel GPU detected, may fall back to WebGL');
          return false;
        }

        return true;
      }
    } catch (e) {
      console.log('WebGPU not available:', e);
    }

    return false;
  }

  private async getWebGLInfo(): Promise<{vendor: string, renderer: string, version: number} | null> {
    // Try WebGL 2 first
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = document.createElement('canvas').getContext('webgl2');
    let version = 2;
    
    if (!gl) {
      gl = document.createElement('canvas').getContext('webgl');
      version = 1;
    }
    
    if (!gl) return null;

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return null;

    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';

    return { vendor, renderer, version };
  }

  private determineGPUType(vendor: string, renderer: string): GPUInfo['type'] {
    const combined = `${vendor} ${renderer}`.toLowerCase();
    
    if (combined.includes('nvidia') || combined.includes('geforce') || 
        combined.includes('rtx') || combined.includes('gtx') || combined.includes('quadro')) {
      return 'nvidia';
    }
    
    if (combined.includes('amd') || combined.includes('radeon') || 
        combined.includes('ati') || combined.includes('vega')) {
      return 'amd';
    }
    
    if (combined.includes('intel') || combined.includes('uhd') || 
        combined.includes('iris') || combined.includes('hd graphics')) {
      return 'intel';
    }
    
    if (combined.includes('apple') || combined.includes('m1') || 
        combined.includes('m2') || combined.includes('m3')) {
      return 'apple';
    }
    
    return 'unknown';
  }

  private isDiscreteGPU(vendor: string, renderer: string): boolean {
    const combined = `${vendor} ${renderer}`.toLowerCase();
    
    // NVIDIA discrete GPUs
    if (combined.includes('nvidia') || combined.includes('geforce') || 
        combined.includes('rtx') || combined.includes('gtx')) {
      // GTX 1650 mentioned by user
      return true;
    }
    
    // AMD discrete GPUs
    if (combined.includes('radeon') && !combined.includes('vega') && 
        !combined.includes('apu')) {
      return true;
    }
    
    // Apple Silicon is considered discrete
    if (combined.includes('apple') || combined.includes('m1') || 
        combined.includes('m2') || combined.includes('m3')) {
      return true;
    }
    
    // Intel integrated graphics
    if (combined.includes('intel') || combined.includes('uhd') || 
        combined.includes('iris') || combined.includes('hd graphics')) {
      return false;
    }
    
    return false;
  }

  private determineGPUTier(renderer: string, isDiscrete: boolean): 'high' | 'medium' | 'low' {
    const r = renderer.toLowerCase();
    
    // High tier GPUs
    if (r.includes('rtx 40') || r.includes('rtx 30') || 
        r.includes('rx 7') || r.includes('rx 6') ||
        r.includes('m2') || r.includes('m3') ||
        r.includes('a100') || r.includes('v100')) {
      return 'high';
    }
    
    // Medium tier GPUs (including GTX 1650)
    if (isDiscrete || r.includes('rtx 20') || r.includes('gtx 16') || 
        r.includes('gtx 10') || r.includes('rx 5') ||
        r.includes('m1') || r.includes('vega')) {
      return 'medium';
    }
    
    // Low tier (integrated graphics)
    return 'low';
  }

  private async checkFP16Support(): Promise<boolean> {
    // Check if the GPU supports half precision
    try {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return false;
      
      const ext = gl.getExtension('EXT_color_buffer_half_float');
      return ext !== null;
    } catch {
      return false;
    }
  }

  private showGPUWarning() {
    const warning = document.createElement('div');
    warning.className = 'gpu-warning';
    warning.innerHTML = `
      <div class="fixed top-4 right-4 max-w-md bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 rounded shadow-lg z-50">
        <div class="flex items-start">
          <span class="material-symbols-outlined mr-2">warning</span>
          <div>
            <p class="font-bold">Integrated Graphics Detected</p>
            <p class="text-sm mt-1">
              Your system is using ${this.gpuInfo?.vendor} integrated graphics. 
              For best performance, a dedicated NVIDIA or AMD GPU is recommended.
              Processing may be slower than optimal.
            </p>
            <button onclick="this.parentElement.parentElement.parentElement.remove()" 
                    class="mt-2 text-xs underline hover:no-underline">
              Dismiss
            </button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(warning);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => warning.remove(), 10000);
  }

  getGPUInfo(): GPUInfo | null {
    return this.gpuInfo;
  }

  isHighPerformance(): boolean {
    return this.gpuInfo?.isDiscrete === true && this.gpuInfo?.tier !== 'low';
  }

  supportsWebGPU(): boolean {
    return this.gpuInfo?.features.webgpu === true;
  }

  getRecommendedBackend(): 'webgpu' | 'webgl' | 'cpu' {
    return this.gpuInfo?.backend || 'cpu';
  }
} 