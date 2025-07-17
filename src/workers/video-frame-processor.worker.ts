/// <reference lib="webworker" />

interface FrameProcessingJob {
  id: string;
  frame: VideoFrame;
  subtitles: Array<{
    text: string;
    startTime: number;
    endTime: number;
  }>;
  style: any;
  timestamp: number;
}

interface ProcessingResult {
  id: string;
  processedFrame: ImageBitmap;
  timestamp: number;
}

class FrameProcessor {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  
  constructor() {
    // Initialize offscreen canvas for frame processing
    this.canvas = new OffscreenCanvas(1920, 1080); // Will be resized as needed
    this.ctx = this.canvas.getContext('2d', {
      willReadFrequently: false,
      alpha: false,
      desynchronized: true
    }) as OffscreenCanvasRenderingContext2D;
  }
  
  async processFrame(job: FrameProcessingJob): Promise<ProcessingResult> {
    const { frame, subtitles, style, timestamp, id } = job;
    
    // Resize canvas if needed
    if (this.canvas.width !== frame.displayWidth || 
        this.canvas.height !== frame.displayHeight) {
      this.canvas.width = frame.displayWidth;
      this.canvas.height = frame.displayHeight;
    }
    
    // Draw video frame
    this.ctx.drawImage(frame, 0, 0);
    
    // Check if we need to render subtitles for this timestamp
    const activeSubtitles = subtitles.filter(
      sub => timestamp >= sub.startTime * 1e6 && timestamp <= sub.endTime * 1e6
    );
    
    // Render subtitles if any are active
    if (activeSubtitles.length > 0) {
      this.renderSubtitles(activeSubtitles, style);
    }
    
    // Convert to ImageBitmap for efficient transfer
    const processedFrame = await createImageBitmap(this.canvas);
    
    // Clean up the input frame
    frame.close();
    
    return {
      id,
      processedFrame,
      timestamp
    };
  }
  
  private renderSubtitles(
    subtitles: Array<{ text: string }>,
    style: any
  ) {
    // Configure text rendering
    const fontSize = style.fontSize || 24;
    const fontFamily = style.fontFamily || 'Arial';
    const fontColor = style.fontColor || '#FFFFFF';
    const backgroundColor = style.backgroundColor || '#000000';
    const backgroundOpacity = style.backgroundOpacity || 0.8;
    
    this.ctx.save();
    
    // Set text properties
    this.ctx.font = `${fontSize}px ${fontFamily}`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'bottom';
    
    // Calculate position
    const x = this.canvas.width / 2;
    let y = this.canvas.height - 50;
    
    if (style.position === 'top') {
      y = 50 + fontSize;
    } else if (style.position === 'center') {
      y = this.canvas.height / 2;
    }
    
    // Render each subtitle
    for (const subtitle of subtitles) {
      // Measure text for background
      const metrics = this.ctx.measureText(subtitle.text);
      const padding = 10;
      
      // Draw background
      this.ctx.fillStyle = this.hexToRgba(backgroundColor, backgroundOpacity);
      this.ctx.fillRect(
        x - metrics.width / 2 - padding,
        y - fontSize - padding,
        metrics.width + padding * 2,
        fontSize + padding * 2
      );
      
      // Draw text shadow
      if (style.textShadow) {
        this.ctx.shadowColor = 'rgba(0,0,0,0.8)';
        this.ctx.shadowBlur = 4;
        this.ctx.shadowOffsetX = 2;
        this.ctx.shadowOffsetY = 2;
      }
      
      // Draw text
      this.ctx.fillStyle = fontColor;
      this.ctx.fillText(subtitle.text, x, y);
      
      // Move up for next subtitle if multiple
      y -= fontSize + 20;
    }
    
    this.ctx.restore();
  }
  
  private hexToRgba(hex: string, opacity: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
  }
}

// Worker message handling
const processor = new FrameProcessor();

self.addEventListener('message', async (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'process-frame':
      try {
        const result = await processor.processFrame(data);
        self.postMessage({
          type: 'frame-processed',
          data: result
        }, [result.processedFrame]);
      } catch (error) {
        self.postMessage({
          type: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
      break;
      
    case 'batch-process':
      // Process multiple frames in batch
      const results: ProcessingResult[] = [];
      
      for (const job of data.jobs) {
        try {
          const result = await processor.processFrame(job);
          results.push(result);
        } catch (error) {
          console.error('Frame processing error:', error);
        }
      }
      
      self.postMessage({
        type: 'batch-processed',
        data: results
      }, results.map(r => r.processedFrame));
      break;
      
    default:
      console.warn('Unknown message type:', type);
  }
}); 