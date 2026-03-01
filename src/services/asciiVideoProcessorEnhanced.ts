// Enhanced ASCII Video Processor with Memory Management and Adaptive Quality
import { ProcessingConfig, FrameData, ProcessingMetrics } from '../types/ascii-video';

interface MemoryConstraints {
  maxMemoryUsage: number; // MB
  maxFrameBufferSize: number;
  adaptiveQuality: boolean;
}

interface AdaptiveConfig {
  scale: number;
  parallelWorkers: number;
  frameSkip: number;
}

export class EnhancedAsciiVideoProcessor {
  // Memory management
  private memoryConstraints: MemoryConstraints = {
    maxMemoryUsage: 512, // 512MB default limit
    maxFrameBufferSize: 30,
    adaptiveQuality: true
  };
  
  private currentMemoryUsage = 0;
  private frameCache = new Map<number, string>();
  private cacheEvictionQueue: number[] = [];
  
  // Performance monitoring
  private performanceHistory: number[] = [];
  private adaptiveConfig: AdaptiveConfig;
  
  // Browser compatibility
  private supportsOffscreenCanvas = 'OffscreenCanvas' in window;
  private supportsWebCodecs = 'VideoDecoder' in window;
  private supportsSharedArrayBuffer = 'SharedArrayBuffer' in window;
  
  constructor(private config: ProcessingConfig) {
    this.adaptiveConfig = {
      scale: config.scale,
      parallelWorkers: config.parallelWorkers,
      frameSkip: 1
    };
    
    this.detectCapabilities();
    this.optimizeForDevice();
  }
  
  private detectCapabilities(): void {
    // Check device capabilities
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const memoryInfo = (performance as any).memory;
    
    if (isMobile) {
      // Reduce constraints for mobile devices
      this.memoryConstraints.maxMemoryUsage = 256;
      this.memoryConstraints.maxFrameBufferSize = 15;
      this.adaptiveConfig.parallelWorkers = Math.min(2, navigator.hardwareConcurrency || 2);
    }
    
    if (memoryInfo) {
      // Adjust based on available memory
      const availableMemory = (memoryInfo.jsHeapSizeLimit - memoryInfo.usedJSHeapSize) / (1024 * 1024);
      this.memoryConstraints.maxMemoryUsage = Math.min(
        this.memoryConstraints.maxMemoryUsage,
        availableMemory * 0.7 // Use max 70% of available memory
      );
    }
    
    console.log('Device capabilities detected:', {
      isMobile,
      supportsOffscreenCanvas: this.supportsOffscreenCanvas,
      supportsWebCodecs: this.supportsWebCodecs,
      maxMemory: this.memoryConstraints.maxMemoryUsage,
      workers: this.adaptiveConfig.parallelWorkers
    });
  }
  
  private optimizeForDevice(): void {
    // Adjust quality based on device performance
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    if (!ctx) return;
    
    // Run a simple performance test
    const testSize = 1000;
    canvas.width = testSize;
    canvas.height = testSize;
    
    const startTime = performance.now();
    for (let i = 0; i < 10; i++) {
      ctx.fillStyle = `rgb(${i * 25}, ${i * 25}, ${i * 25})`;
      ctx.fillRect(0, 0, testSize, testSize);
      ctx.getImageData(0, 0, testSize, testSize);
    }
    const elapsed = performance.now() - startTime;
    
    // Adjust quality based on performance
    if (elapsed > 100) {
      // Slow device
      this.adaptiveConfig.scale *= 0.75;
      this.adaptiveConfig.frameSkip = 2;
    } else if (elapsed > 50) {
      // Medium device
      this.adaptiveConfig.scale *= 0.9;
    }
    
    console.log('Performance test:', { elapsed, adaptiveConfig: this.adaptiveConfig });
  }
  
  // Memory management methods
  private checkMemoryUsage(): number {
    const memoryInfo = (performance as any).memory;
    if (memoryInfo) {
      this.currentMemoryUsage = memoryInfo.usedJSHeapSize / (1024 * 1024);
      return this.currentMemoryUsage;
    }
    
    // Estimate based on cache size
    const avgFrameSize = 0.5; // MB per frame estimate
    this.currentMemoryUsage = this.frameCache.size * avgFrameSize;
    return this.currentMemoryUsage;
  }
  
  private evictFramesIfNeeded(): void {
    if (this.currentMemoryUsage > this.memoryConstraints.maxMemoryUsage * 0.9) {
      // Evict oldest frames
      const framesToEvict = Math.floor(this.cacheEvictionQueue.length * 0.3);
      for (let i = 0; i < framesToEvict; i++) {
        const frameNumber = this.cacheEvictionQueue.shift();
        if (frameNumber !== undefined) {
          this.frameCache.delete(frameNumber);
        }
      }
      
      console.log(`Evicted ${framesToEvict} frames to free memory`);
    }
  }
  
  // Adaptive quality adjustment
  private adjustQualityBasedOnPerformance(fps: number): void {
    if (!this.memoryConstraints.adaptiveQuality) return;
    
    this.performanceHistory.push(fps);
    if (this.performanceHistory.length > 10) {
      this.performanceHistory.shift();
    }
    
    const avgFps = this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length;
    
    if (avgFps < 15 && this.adaptiveConfig.scale > 0.3) {
      // Reduce quality
      this.adaptiveConfig.scale *= 0.9;
      this.adaptiveConfig.frameSkip = Math.min(3, this.adaptiveConfig.frameSkip + 1);
      console.log('Reducing quality due to low FPS:', this.adaptiveConfig);
    } else if (avgFps > 30 && this.adaptiveConfig.scale < this.config.scale) {
      // Increase quality
      this.adaptiveConfig.scale = Math.min(this.config.scale, this.adaptiveConfig.scale * 1.1);
      this.adaptiveConfig.frameSkip = Math.max(1, this.adaptiveConfig.frameSkip - 1);
      console.log('Increasing quality due to high FPS:', this.adaptiveConfig);
    }
  }
  
  // Browser-specific optimizations
  async processVideoFrame(frameData: FrameData): Promise<string> {
    // Check memory before processing
    this.checkMemoryUsage();
    this.evictFramesIfNeeded();
    
    if (this.supportsOffscreenCanvas) {
      // Use OffscreenCanvas for better performance
      return this.processWithOffscreenCanvas(frameData);
    } else {
      // Fallback to standard processing
      return this.processWithStandardCanvas(frameData);
    }
  }
  
  private async processWithOffscreenCanvas(frameData: FrameData): Promise<string> {
    const offscreen = new OffscreenCanvas(frameData.width, frameData.height);
    const ctx = offscreen.getContext('2d');
    
    if (!ctx) throw new Error('Failed to get OffscreenCanvas context');
    
    // Create ImageData from pixels
    const imageData = new ImageData(frameData.pixels, frameData.width, frameData.height);
    ctx.putImageData(imageData, 0, 0);
    
    // Process in worker if supported
    if (this.supportsSharedArrayBuffer) {
      // Use SharedArrayBuffer for zero-copy transfer
      const sharedBuffer = new SharedArrayBuffer(frameData.pixels.length);
      const sharedArray = new Uint8ClampedArray(sharedBuffer);
      sharedArray.set(frameData.pixels);
      
      // Send to worker with SharedArrayBuffer
      return this.processInWorker({ ...frameData, pixels: sharedArray });
    }
    
    return this.processInWorker(frameData);
  }
  
  private async processWithStandardCanvas(frameData: FrameData): Promise<string> {
    // Standard processing for older browsers
    return this.processInWorker(frameData);
  }
  
  private processInWorker(frameData: FrameData): Promise<string> {
    return new Promise((resolve) => {
      // Find available worker
      const workerIndex = frameData.frameNumber % this.adaptiveConfig.parallelWorkers;
      
      // Simplified processing for demonstration
      // In real implementation, this would send to actual worker
      setTimeout(() => {
        const processedAscii = this.generateAscii(frameData);
        
        // Cache the result
        this.frameCache.set(frameData.frameNumber, processedAscii);
        this.cacheEvictionQueue.push(frameData.frameNumber);
        
        resolve(processedAscii);
      }, 10);
    });
  }
  
  private generateAscii(frameData: FrameData): string {
    // Simplified ASCII generation
    const chars = this.config.asciiChars;
    const { width, height, pixels } = frameData;
    let ascii = '';
    
    const step = this.adaptiveConfig.frameSkip;
    
    for (let y = 0; y < height; y += step) {
      for (let x = 0; x < width; x += step) {
        const idx = (y * width + x) * 4;
        const brightness = (pixels[idx] + pixels[idx + 1] + pixels[idx + 2]) / 3;
        const charIndex = Math.floor((brightness / 255) * (chars.length - 1));
        ascii += chars[charIndex];
      }
      ascii += '\n';
    }
    
    return ascii;
  }
  
  // Export optimization for large videos
  async exportWithStreaming(processedFrames: string[], format: 'text' | 'html'): Promise<ReadableStream> {
    const encoder = new TextEncoder();
    let frameIndex = 0;
    
    return new ReadableStream({
      start(controller) {
        if (format === 'html') {
          // Send HTML header
          const header = `<!DOCTYPE html>
<html>
<head>
  <title>ASCII Video Stream</title>
  <style>
    body { background: #000; color: #0f0; font-family: monospace; margin: 0; padding: 20px; }
    .frame { display: none; white-space: pre; line-height: 1; }
    .frame.active { display: block; }
  </style>
</head>
<body>
<div id="player">`;
          controller.enqueue(encoder.encode(header));
        }
      },
      
      pull(controller) {
        if (frameIndex < processedFrames.length) {
          const frame = processedFrames[frameIndex];
          let chunk = '';
          
          if (format === 'html') {
            chunk = `<pre class="frame" data-frame="${frameIndex}">${frame}</pre>\n`;
          } else {
            chunk = frame + '\n' + '='.repeat(80) + '\n\n';
          }
          
          controller.enqueue(encoder.encode(chunk));
          frameIndex++;
        } else {
          // Send footer and close
          if (format === 'html') {
            const footer = `</div>
<script>
let currentFrame = 0;
const frames = document.querySelectorAll('.frame');
function animate() {
  frames.forEach(f => f.classList.remove('active'));
  frames[currentFrame].classList.add('active');
  currentFrame = (currentFrame + 1) % frames.length;
  setTimeout(animate, 33);
}
animate();
</script>
</body>
</html>`;
            controller.enqueue(encoder.encode(footer));
          }
          controller.close();
        }
      }
    });
  }
  
  // Get current adaptive settings
  getAdaptiveSettings(): AdaptiveConfig {
    return { ...this.adaptiveConfig };
  }
  
  // Update memory constraints
  setMemoryConstraints(constraints: Partial<MemoryConstraints>): void {
    this.memoryConstraints = { ...this.memoryConstraints, ...constraints };
  }
  
  // Performance metrics
  getPerformanceMetrics(): {
    avgFps: number;
    memoryUsage: number;
    cacheSize: number;
    adaptiveScale: number;
  } {
    const avgFps = this.performanceHistory.length > 0
      ? this.performanceHistory.reduce((a, b) => a + b, 0) / this.performanceHistory.length
      : 0;
    
    return {
      avgFps,
      memoryUsage: this.currentMemoryUsage,
      cacheSize: this.frameCache.size,
      adaptiveScale: this.adaptiveConfig.scale
    };
  }
} 