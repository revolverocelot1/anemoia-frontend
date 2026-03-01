import type { SubtitleSegment, SubtitleStyle } from '../types/caption-studio';

export class OffscreenSubtitleRenderer {
  private canvas: OffscreenCanvas;
  private ctx: OffscreenCanvasRenderingContext2D;
  private worker: Worker | null = null;
  private renderQueue: Array<() => void> = [];
  private isRendering = false;
  private lastRenderTime = 0;
  private frameThrottleMs = 16; // ~60fps

  constructor(width: number = 1920, height: number = 1080) {
    // Create OffscreenCanvas for better performance
    this.canvas = new OffscreenCanvas(width, height);
    const ctx = this.canvas.getContext('2d', {
      alpha: true,
      desynchronized: true,
      willReadFrequently: false // Force GPU acceleration
    });

    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }

    this.ctx = ctx;
    this.setupContext();
  }

  private setupContext(): void {
    // Enable best quality text rendering
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
    
    // Set default text properties
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
  }

  async renderSubtitle(
    subtitle: SubtitleSegment,
    width: number,
    height: number,
    currentTime: number
  ): Promise<ImageBitmap | null> {
    // Check if subtitle should be visible
    if (currentTime < subtitle.startTime || currentTime > subtitle.endTime) {
      return null;
    }

    // Throttle rendering to avoid overloading
    const now = performance.now();
    if (now - this.lastRenderTime < this.frameThrottleMs) {
      return null;
    }
    this.lastRenderTime = now;

    // Queue render operation
    return new Promise((resolve) => {
      this.renderQueue.push(() => {
        this.performRender(subtitle, width, height);
        
        // Create ImageBitmap for efficient transfer
        createImageBitmap(this.canvas).then(resolve).catch(() => resolve(null));
      });

      this.processRenderQueue();
    });
  }

  private async processRenderQueue(): Promise<void> {
    if (this.isRendering || this.renderQueue.length === 0) return;

    this.isRendering = true;

    while (this.renderQueue.length > 0) {
      const render = this.renderQueue.shift();
      if (render) {
        await new Promise(resolve => {
          requestAnimationFrame(() => {
            render();
            resolve(undefined);
          });
        });
      }
    }

    this.isRendering = false;
  }

  private performRender(
    subtitle: SubtitleSegment,
    width: number,
    height: number
  ): void {
    // Resize canvas if needed
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Calculate text position
    const x = subtitle.position?.x ? (subtitle.position.x / 100) * width : width / 2;
    const y = subtitle.position?.y ? (subtitle.position.y / 100) * height : height - 60;

    // Apply styles
    const style: Partial<SubtitleStyle> = subtitle.style || {};
    const fontSize = style.fontSize || 32;
    const fontFamily = style.fontFamily || 'Arial';
    const fontWeight = style.fontWeight || 'normal';
    const fontStyle = style.fontStyle || 'normal';

    this.ctx.font = `${fontStyle} ${fontWeight} ${fontSize}px ${fontFamily}`;
    
    // Text shadow for better readability
    if (style.shadowColor) {
      this.ctx.shadowColor = style.shadowColor;
      this.ctx.shadowBlur = style.shadowBlur || 4;
      this.ctx.shadowOffsetX = 2;
      this.ctx.shadowOffsetY = 2;
    } else {
      // Default shadow for readability
      this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
      this.ctx.shadowBlur = 4;
      this.ctx.shadowOffsetX = 2;
      this.ctx.shadowOffsetY = 2;
    }

    // Background box
    if (style.backgroundColor && style.backgroundColor !== 'transparent') {
      const metrics = this.ctx.measureText(subtitle.text);
      const padding = style.padding || 10;
      const boxWidth = metrics.width + padding * 2;
      const boxHeight = fontSize + padding * 2;
      
      this.ctx.globalAlpha = style.backgroundOpacity || 0.8;
      this.ctx.fillStyle = style.backgroundColor;
      
      // Apply background blur if specified
      if (style.backgroundBlur && style.backgroundBlur > 0) {
        this.ctx.filter = `blur(${style.backgroundBlur}px)`;
      }
      
      this.ctx.fillRect(x - boxWidth / 2, y - boxHeight / 2, boxWidth, boxHeight);
      
      // Reset
      this.ctx.globalAlpha = 1;
      this.ctx.filter = 'none';
    }

    // Draw text stroke if specified
    if (style.strokeColor && style.strokeWidth && style.strokeWidth > 0) {
      this.ctx.strokeStyle = style.strokeColor;
      this.ctx.lineWidth = style.strokeWidth;
      
      // Handle multi-line text for stroke
      const lines = subtitle.text.split('\n');
      const lineHeight = fontSize * 1.2;
      const totalHeight = lines.length * lineHeight;
      const startY = y - totalHeight / 2 + lineHeight / 2;

      lines.forEach((line, index) => {
        this.ctx.strokeText(line, x, startY + index * lineHeight);
      });
    }

    // Draw text
    this.ctx.fillStyle = style.color || '#FFFFFF';
    
    // Handle multi-line text
    const lines = subtitle.text.split('\n');
    const lineHeight = fontSize * 1.2;
    const totalHeight = lines.length * lineHeight;
    const startY = y - totalHeight / 2 + lineHeight / 2;

    lines.forEach((line, index) => {
      this.ctx.fillText(line, x, startY + index * lineHeight);
    });
  }

  async renderBatch(
    subtitles: SubtitleSegment[],
    width: number,
    height: number,
    currentTime: number
  ): Promise<ImageBitmap | null> {
    // Filter visible subtitles
    const visibleSubtitles = subtitles.filter(
      s => currentTime >= s.startTime && currentTime <= s.endTime
    );

    if (visibleSubtitles.length === 0) {
      return null;
    }

    // Throttle rendering
    const now = performance.now();
    if (now - this.lastRenderTime < this.frameThrottleMs) {
      return null;
    }
    this.lastRenderTime = now;

    // Resize canvas if needed
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }

    // Clear canvas
    this.ctx.clearRect(0, 0, width, height);

    // Render all visible subtitles
    visibleSubtitles.forEach(subtitle => {
      this.performRender(subtitle, width, height);
    });

    // Create ImageBitmap for efficient transfer
    try {
      return await createImageBitmap(this.canvas);
    } catch (error) {
      console.error('[OffscreenRenderer] Failed to create bitmap:', error);
      return null;
    }
  }

  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  resize(width: number, height: number): void {
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
      this.setupContext();
    }
  }

  destroy(): void {
    // Clean up resources
    this.renderQueue = [];
    this.worker?.terminate();
    this.worker = null;
  }
}

// Factory function for creating renderer
export function createOffscreenSubtitleRenderer(width?: number, height?: number): OffscreenSubtitleRenderer {
  return new OffscreenSubtitleRenderer(width, height);
} 