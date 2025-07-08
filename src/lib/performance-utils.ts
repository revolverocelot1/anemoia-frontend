import { SubtitleSegment } from '../types/subtitle';

/**
 * Performance optimization utilities for CPU and GPU
 */

// Debounce function for reducing CPU usage
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function for limiting execution rate
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return function(this: any, ...args: Parameters<T>) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Request idle callback polyfill
export const requestIdleCallback = 
  window.requestIdleCallback ||
  function (cb: IdleRequestCallback) {
    const start = Date.now();
    return setTimeout(function () {
      cb({
        didTimeout: false,
        timeRemaining: function () {
          return Math.max(0, 50 - (Date.now() - start));
        },
      } as IdleDeadline);
    }, 1);
  };

// Cancel idle callback polyfill
export const cancelIdleCallback = 
  window.cancelIdleCallback ||
  function (id: number) {
    clearTimeout(id);
  };

// Optimize video processing
export const optimizeVideoProcessing = () => {
  // Enable hardware acceleration hints
  const videos = document.querySelectorAll('video');
  videos.forEach(video => {
    // Force hardware acceleration
    (video as any).disablePictureInPicture = false;
    video.setAttribute('playsinline', 'true');
    
    // Optimize for smooth playback
    if ('requestVideoFrameCallback' in video) {
      let frameId: number;
      const processFrame = () => {
        // Process video frame with minimal CPU usage
        frameId = (video as any).requestVideoFrameCallback(processFrame);
      };
      processFrame();
    }
  });
};

// Web Worker pool for CPU-intensive tasks
class WorkerPool {
  private workers: Worker[] = [];
  private queue: Array<{ data: any; resolve: (value: any) => void }> = [];
  private busy: boolean[] = [];

  constructor(workerScript: string, poolSize: number = navigator.hardwareConcurrency || 4) {
    for (let i = 0; i < poolSize; i++) {
      const worker = new Worker(workerScript);
      this.workers.push(worker);
      this.busy.push(false);
      
      worker.onmessage = (e) => {
        this.busy[i] = false;
        this.processQueue();
      };
    }
  }

  execute(data: any): Promise<any> {
    return new Promise((resolve) => {
      this.queue.push({ data, resolve });
      this.processQueue();
    });
  }

  private processQueue() {
    if (this.queue.length === 0) return;
    
    const freeWorkerIndex = this.busy.findIndex(b => !b);
    if (freeWorkerIndex === -1) return;
    
    const { data, resolve } = this.queue.shift()!;
    this.busy[freeWorkerIndex] = true;
    
    this.workers[freeWorkerIndex].onmessage = (e) => {
      this.busy[freeWorkerIndex] = false;
      resolve(e.data);
      this.processQueue();
    };
    
    this.workers[freeWorkerIndex].postMessage(data);
  }

  terminate() {
    this.workers.forEach(worker => worker.terminate());
  }
}

// GPU optimization utilities
export const gpuOptimizations = {
  // Check WebGL support and capabilities
  checkWebGLSupport(): { supported: boolean; version: string; maxTextureSize: number } {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    
    if (!gl) {
      return { supported: false, version: 'none', maxTextureSize: 0 };
    }
    
    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'Unknown';
    const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'Unknown';
    
    console.log('GPU Info:', { vendor, renderer });
    
    return {
      supported: true,
      version: gl instanceof WebGL2RenderingContext ? 'webgl2' : 'webgl',
      maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE)
    };
  },

  // Enable GPU-accelerated CSS
  enableGPUAcceleration(element: HTMLElement) {
    element.style.transform = 'translateZ(0)';
    element.style.willChange = 'transform';
    (element.style as any).webkitTransform = 'translateZ(0)';
    (element.style as any).webkitBackfaceVisibility = 'hidden';
  },

  // Optimize canvas rendering
  optimizeCanvasRendering(canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: true,
      willReadFrequently: false
    });
    
    if (ctx) {
      ctx.imageSmoothingEnabled = false;
      (ctx as any).webkitImageSmoothingEnabled = false;
      (ctx as any).mozImageSmoothingEnabled = false;
    }
    
    return ctx;
  }
};

// Memory optimization
export const memoryOptimizations = {
  // Clean up blob URLs
  cleanupBlobUrls(urls: string[]) {
    urls.forEach(url => {
      if (url.startsWith('blob:')) {
        URL.revokeObjectURL(url);
      }
    });
  },

  // Lazy load images
  lazyLoadImages(selector: string = 'img[data-src]') {
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target as HTMLImageElement;
            img.src = img.dataset.src!;
            img.removeAttribute('data-src');
            observer.unobserve(img);
          }
        });
      });

      document.querySelectorAll(selector).forEach(img => imageObserver.observe(img));
    }
  },

  // Virtual scrolling for large lists
  virtualScroll(container: HTMLElement, items: any[], itemHeight: number, renderItem: (item: any) => HTMLElement) {
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.ceil((scrollTop + containerHeight) / itemHeight);
    
    const visibleItems = items.slice(startIndex, endIndex);
    
    // Clear container
    container.innerHTML = '';
    
    // Add spacer for items above
    const spacerTop = document.createElement('div');
    spacerTop.style.height = `${startIndex * itemHeight}px`;
    container.appendChild(spacerTop);
    
    // Render visible items
    visibleItems.forEach(item => {
      container.appendChild(renderItem(item));
    });
    
    // Add spacer for items below
    const spacerBottom = document.createElement('div');
    spacerBottom.style.height = `${(items.length - endIndex) * itemHeight}px`;
    container.appendChild(spacerBottom);
  }
};

// Performance monitoring
export const performanceMonitor = {
  markers: new Map<string, number>(),
  
  mark(label: string) {
    this.markers.set(label, performance.now());
  },
  
  measure(label: string, startLabel: string) {
    const start = this.markers.get(startLabel);
    const end = performance.now();
    
    if (start) {
      const duration = end - start;
      console.log(`Performance: ${label} took ${duration.toFixed(2)}ms`);
      return duration;
    }
    
    return 0;
  },
  
  // Monitor frame rate
  monitorFPS(callback: (fps: number) => void) {
    let lastTime = performance.now();
    let frames = 0;
    let fps = 0;
    
    const update = () => {
      frames++;
      const currentTime = performance.now();
      
      if (currentTime >= lastTime + 1000) {
        fps = Math.round((frames * 1000) / (currentTime - lastTime));
        frames = 0;
        lastTime = currentTime;
        callback(fps);
      }
      
      requestAnimationFrame(update);
    };
    
    update();
  }
};

// Export worker pool creator
export { WorkerPool }; 