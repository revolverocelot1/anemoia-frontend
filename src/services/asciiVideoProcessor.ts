// ASCII Video Processor Service
// Handles video loading, frame extraction, parallel processing, and export

import { ProcessingConfig, FrameData, ProcessingMetrics } from '../types/ascii-video';

export class AsciiVideoProcessor {
  private video: HTMLVideoElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private workers: Worker[] = [];
  private frameQueue: FrameData[] = [];
  private processedFrames: Map<number, string> = new Map();
  private frameBuffer: number = 30;
  private isProcessing: boolean = false;
  private isPaused: boolean = false;
  private totalFrames: number = 0;
  private currentFrame: number = 0;
  private startTime: number = 0;
  
  // Callbacks
  private onProgress?: (metrics: ProcessingMetrics) => void;
  private onFrameProcessed?: (frame: FrameData) => void;
  private onComplete?: (result: ProcessedVideo) => void;
  private onError?: (error: Error) => void;

  constructor(private config: ProcessingConfig) {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d')!;
    this.video = document.createElement('video');
    this.initializeWorkers();
  }

  private initializeWorkers(): void {
    // Create worker pool based on config
    for (let i = 0; i < this.config.parallelWorkers; i++) {
      const worker = new Worker(
        new URL('../workers/asciiProcessor.worker.ts', import.meta.url)
      );
      
      worker.onmessage = this.handleWorkerMessage.bind(this);
      this.workers.push(worker);
    }
  }

  private handleWorkerMessage(e: MessageEvent): void {
    const { type, data } = e.data;
    
    switch (type) {
      case 'frameProcessed':
        this.handleProcessedFrame(data);
        break;
      case 'metrics':
        // Handle metrics update if needed
        break;
    }
  }

  private handleProcessedFrame(frameData: FrameData): void {
    // Store processed frame
    this.processedFrames.set(frameData.frameNumber, frameData.processed!);
    this.currentFrame++;
    
    // Trigger callback
    if (this.onFrameProcessed) {
      this.onFrameProcessed(frameData);
    }
    
    // Update progress
    this.updateProgress();
    
    // Check if processing complete
    if (this.currentFrame >= this.totalFrames) {
      this.completeProcessing();
    } else if (!this.isPaused) {
      this.processNextBatch();
    }
  }

  private updateProgress(): void {
    const elapsed = performance.now() - this.startTime;
    const fps = this.currentFrame / (elapsed / 1000);
    const estimatedTime = (this.totalFrames - this.currentFrame) / fps;
    
    const metrics: ProcessingMetrics = {
      fps,
      processedFrames: this.currentFrame,
      totalFrames: this.totalFrames,
      estimatedTime,
      cpuUsage: this.calculateCPUUsage(),
      memoryUsage: this.calculateMemoryUsage()
    };
    
    if (this.onProgress) {
      this.onProgress(metrics);
    }
  }

  private calculateCPUUsage(): number {
    // Simplified CPU usage calculation
    // In production, you'd use performance monitoring APIs
    return Math.min(100, this.config.parallelWorkers * 12.5);
  }

  private calculateMemoryUsage(): number {
    // Estimate memory usage based on frame cache
    const bytesPerFrame = this.canvas.width * this.canvas.height * 4;
    const cachedFrames = this.processedFrames.size;
    return (bytesPerFrame * cachedFrames) / (1024 * 1024); // MB
  }

  async processVideo(file: File): Promise<void> {
    try {
      this.reset();
      this.isProcessing = true;
      this.startTime = performance.now();
      
      // Load video
      const url = URL.createObjectURL(file);
      this.video.src = url;
      
      await new Promise<void>((resolve, reject) => {
        this.video.onloadedmetadata = () => resolve();
        this.video.onerror = () => reject(new Error('Failed to load video'));
      });
      
      // Calculate total frames
      this.totalFrames = Math.floor(this.video.duration * 30); // Assuming 30fps
      
      // Set canvas size based on scale
      const scaledWidth = Math.floor(this.video.videoWidth * this.config.scale);
      const scaledHeight = Math.floor(
        (this.video.videoHeight * this.config.scale) / this.config.aspectRatio
      );
      
      this.canvas.width = scaledWidth;
      this.canvas.height = scaledHeight;
      
      // Start processing
      this.processNextBatch();
      
    } catch (error) {
      this.handleError(error as Error);
    }
  }

  private async processNextBatch(): Promise<void> {
    if (this.isPaused || !this.isProcessing) return;
    
    const batchSize = Math.min(
      this.config.parallelWorkers,
      this.totalFrames - this.currentFrame
    );
    
    const framePromises: Promise<FrameData>[] = [];
    
    for (let i = 0; i < batchSize; i++) {
      const frameNumber = this.currentFrame + i;
      if (frameNumber >= this.totalFrames) break;
      
      // Check cache first
      if (this.processedFrames.has(frameNumber)) {
        continue;
      }
      
      framePromises.push(this.extractFrame(frameNumber));
    }
    
    // Extract frames in parallel
    const frames = await Promise.all(framePromises);
    
    // Distribute frames to workers
    frames.forEach((frame: FrameData, index: number) => {
      const workerIndex = index % this.workers.length;
      this.workers[workerIndex].postMessage({
        type: 'processFrame',
        data: {
          frameData: frame,
          config: {
            asciiChars: this.config.asciiChars,
            colorMode: this.config.colorMode,
            brightness: this.config.brightness,
            contrast: this.config.contrast,
            edgeDetection: this.config.edgeDetection,
            edgeThreshold: this.config.edgeThreshold
          }
        }
      });
    });
  }

  private async extractFrame(frameNumber: number): Promise<FrameData> {
    // Seek to frame time
    const frameTime = frameNumber / 30; // Assuming 30fps
    this.video.currentTime = frameTime;
    
    await new Promise<void>(resolve => {
      this.video.onseeked = () => resolve();
    });
    
    // Draw frame to canvas
    this.ctx.drawImage(
      this.video,
      0, 0,
      this.canvas.width,
      this.canvas.height
    );
    
    // Get pixel data
    const imageData = this.ctx.getImageData(
      0, 0,
      this.canvas.width,
      this.canvas.height
    );
    
    return {
      frameNumber,
      timestamp: frameTime,
      width: this.canvas.width,
      height: this.canvas.height,
      pixels: imageData.data
    };
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    if (this.isPaused && this.isProcessing) {
      this.isPaused = false;
      this.processNextBatch();
    }
  }

  cancel(): void {
    this.isProcessing = false;
    this.isPaused = false;
    this.reset();
  }

  private completeProcessing(): void {
    this.isProcessing = false;
    
    // Convert processed frames to video format
    const result: ProcessedVideo = {
      frames: Array.from(this.processedFrames.entries())
        .sort(([a], [b]) => a - b)
        .map(([_, ascii]) => ascii),
      fps: 30,
      width: this.canvas.width,
      height: this.canvas.height,
      duration: this.video.duration
    };
    
    if (this.onComplete) {
      this.onComplete(result);
    }
  }

  private handleError(error: Error): void {
    this.isProcessing = false;
    if (this.onError) {
      this.onError(error);
    }
  }

  private reset(): void {
    this.frameQueue = [];
    this.processedFrames.clear();
    this.currentFrame = 0;
    this.totalFrames = 0;
  }

  // Export functions
  async exportAsVideo(processedVideo: ProcessedVideo): Promise<Blob> {
    // Use WebCodecs API or ffmpeg.wasm to create video
    // This is a placeholder - actual implementation would use video encoding
    const videoBlob = new Blob(['video data'], { type: 'video/mp4' });
    return videoBlob;
  }

  async exportAsTextFile(processedVideo: ProcessedVideo): Promise<Blob> {
    const text = processedVideo.frames.join('\n\n' + '='.repeat(80) + '\n\n');
    return new Blob([text], { type: 'text/plain' });
  }

  async exportAsHTML(processedVideo: ProcessedVideo): Promise<Blob> {
    const html = `
<!DOCTYPE html>
<html>
<head>
  <title>ASCII Video</title>
  <style>
    body { background: #000; color: #0f0; font-family: monospace; }
    pre { margin: 0; line-height: 1; }
    .frame { display: none; }
    .frame.active { display: block; }
  </style>
</head>
<body>
  <div id="player">
    ${processedVideo.frames.map((frame, i) => 
      `<pre class="frame" data-frame="${i}">${frame}</pre>`
    ).join('')}
  </div>
  <script>
    let currentFrame = 0;
    const frames = document.querySelectorAll('.frame');
    const fps = ${processedVideo.fps};
    
    function showFrame(index) {
      frames.forEach(f => f.classList.remove('active'));
      frames[index].classList.add('active');
    }
    
    function animate() {
      showFrame(currentFrame);
      currentFrame = (currentFrame + 1) % frames.length;
      setTimeout(animate, 1000 / fps);
    }
    
    animate();
  </script>
</body>
</html>`;
    
    return new Blob([html], { type: 'text/html' });
  }

  // Callbacks
  onProgressUpdate(callback: (metrics: ProcessingMetrics) => void): void {
    this.onProgress = callback;
  }

  onFrameProcessedUpdate(callback: (frame: FrameData) => void): void {
    this.onFrameProcessed = callback;
  }

  onCompleteUpdate(callback: (result: ProcessedVideo) => void): void {
    this.onComplete = callback;
  }

  onErrorUpdate(callback: (error: Error) => void): void {
    this.onError = callback;
  }

  // Cleanup
  destroy(): void {
    this.workers.forEach(worker => worker.terminate());
    this.workers = [];
    this.reset();
  }
}

// Type definitions
export interface ProcessedVideo {
  frames: string[];
  fps: number;
  width: number;
  height: number;
  duration: number;
} 