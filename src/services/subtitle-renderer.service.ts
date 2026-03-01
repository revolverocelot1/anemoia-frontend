import type { SubtitleSegment, SubtitleStyle, SubtitlePosition } from '../types/caption-studio';

export class SubtitleRenderer {
  public readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private offscreenCanvas?: OffscreenCanvas;
  private offscreenCtx?: OffscreenCanvasRenderingContext2D;
  private textCache: Map<string, ImageBitmap> = new Map();
  private fontLoaded: boolean = false;

  constructor(canvas?: HTMLCanvasElement) {
    this.canvas = canvas || document.createElement('canvas');
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    
    // Force GPU acceleration by setting willReadFrequently to false
    const ctx = this.canvas.getContext('2d', {
      willReadFrequently: false,
      desynchronized: true,
      alpha: true
    });
    
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    
    this.ctx = ctx;
    
    // Enable image smoothing for better text quality
    this.ctx.imageSmoothingEnabled = true;
    this.ctx.imageSmoothingQuality = 'high';
  }

  private async loadFonts() {
    try {
      // Check if fonts API is available
      if ('fonts' in document) {
        await (document as any).fonts.load('bold 24px Arial');
        await (document as any).fonts.load('24px Arial');
        this.fontLoaded = true;
        console.log('[SubtitleRenderer] Fonts loaded successfully');
      }
    } catch (error) {
      console.warn('[SubtitleRenderer] Font loading failed:', error);
      this.fontLoaded = true; // Continue anyway with fallback
    }
  }

  setSize(width: number, height: number) {
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Handle high DPI displays
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;
    this.canvas.width = width * dpr;
    this.canvas.height = height * dpr;
    this.ctx.scale(dpr, dpr);
    
    if (this.offscreenCanvas && this.offscreenCtx) {
      this.offscreenCanvas.width = width * dpr;
      this.offscreenCanvas.height = height * dpr;
      this.offscreenCtx.scale(dpr, dpr);
    }
  }

  clear() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderSubtitle(
    subtitle: SubtitleSegment,
    videoWidth: number,
    videoHeight: number,
    currentTime: number
  ) {
    // Check if subtitle should be displayed
    if (currentTime < subtitle.startTime || currentTime > subtitle.endTime) {
      return;
    }

    const ctx = this.offscreenCtx || this.ctx;
    const style = subtitle.style || this.getDefaultStyle();
    const position = subtitle.position || this.getDefaultPosition();

    // Save context state
    ctx.save();

    // Ensure proper rendering settings
    ctx.globalCompositeOperation = 'source-over';
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Calculate actual position
    const x = (position.x / 100) * videoWidth;
    const y = (position.y / 100) * videoHeight;

    // Configure text style with fallback fonts
    const fontFamily = style.fontFamily || 'Arial, sans-serif';
    ctx.font = `${style.fontWeight || 'bold'} ${style.fontStyle || 'normal'} ${style.fontSize}px ${fontFamily}`;
    ctx.textAlign = position.alignment as CanvasTextAlign;
    ctx.textBaseline = position.verticalAlignment as CanvasTextBaseline;

    // Measure text for background
    const lines = this.wrapText(subtitle.text, videoWidth * 0.8, ctx);
    const lineHeight = style.fontSize * 1.2;
    const maxWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
    const totalHeight = lines.length * lineHeight;

    // Draw background if specified
    if (style.backgroundColor && style.backgroundOpacity && style.backgroundOpacity > 0) {
      ctx.save();
      ctx.globalAlpha = style.backgroundOpacity;
      ctx.fillStyle = style.backgroundColor;
      
      const padding = style.padding || 10;
      const bgX = this.getBackgroundX(x, maxWidth, position.alignment, padding);
      const bgY = this.getBackgroundY(y, totalHeight, position.verticalAlignment, padding);
      
      // Add blur effect if specified
      if (style.backgroundBlur && style.backgroundBlur > 0) {
        ctx.filter = `blur(${style.backgroundBlur}px)`;
      }
      
      this.drawRoundedRect(ctx, bgX, bgY, maxWidth + padding * 2, totalHeight + padding * 2, 5);
      ctx.fill();
      ctx.filter = 'none'; // Reset filter
      ctx.restore();
    }

    // Draw text with effects
    lines.forEach((line, index) => {
      const lineY = this.getLineY(y, index, lineHeight, lines.length, position.verticalAlignment);
      
      // Shadow effect
      if (style.shadowColor && style.shadowBlur && style.shadowBlur > 0) {
        ctx.save();
        ctx.shadowColor = style.shadowColor;
        ctx.shadowBlur = style.shadowBlur;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        ctx.globalAlpha = 1;
        ctx.fillStyle = style.color || '#FFFFFF';
        ctx.fillText(line, x, lineY);
        ctx.restore();
      }
      
      // Stroke effect
      if (style.strokeColor && style.strokeWidth && style.strokeWidth > 0) {
        ctx.save();
        ctx.strokeStyle = style.strokeColor;
        ctx.lineWidth = style.strokeWidth;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.globalAlpha = 1;
        ctx.strokeText(line, x, lineY);
        ctx.restore();
      }
      
      // Main text
      ctx.save();
      ctx.fillStyle = style.color || '#FFFFFF';
      ctx.globalAlpha = 1;
      ctx.fillText(line, x, lineY);
      ctx.restore();
    });

    // Restore context state
    ctx.restore();

    // Copy from offscreen canvas if used
    if (this.offscreenCanvas && this.offscreenCtx && ctx === this.offscreenCtx) {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    }
  }

  private wrapText(text: string, maxWidth: number, ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const metrics = ctx.measureText(testLine);
      
      if (metrics.width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    
    if (currentLine) {
      lines.push(currentLine);
    }
    
    return lines;
  }

  private getBackgroundX(x: number, width: number, alignment: string, padding: number): number {
    switch (alignment) {
      case 'left': return x - padding;
      case 'right': return x - width - padding;
      default: return x - width / 2 - padding; // center
    }
  }

  private getBackgroundY(y: number, height: number, verticalAlignment: string, padding: number): number {
    switch (verticalAlignment) {
      case 'top': return y - padding;
      case 'bottom': return y - height - padding;
      default: return y - height / 2 - padding; // middle
    }
  }

  private getLineY(baseY: number, index: number, lineHeight: number, totalLines: number, verticalAlignment: string): number {
    const offset = index * lineHeight;
    
    switch (verticalAlignment) {
      case 'top': return baseY + offset + lineHeight;
      case 'bottom': return baseY - (totalLines - index - 1) * lineHeight;
      default: return baseY - (totalLines / 2 - index - 0.5) * lineHeight; // middle
    }
  }

  private drawRoundedRect(
    ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number
  ) {
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height - radius);
    ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    ctx.lineTo(x + radius, y + height);
    ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
  }

  private getDefaultStyle(): SubtitleStyle {
    return {
      fontFamily: 'Arial, sans-serif',
      fontSize: 28,
      fontWeight: 'bold',
      fontStyle: 'normal',
      color: '#FFFFFF',
      backgroundColor: '#000000',
      backgroundOpacity: 0.75,
      backgroundBlur: 0,
      strokeColor: '#000000',
      strokeWidth: 3,
      shadowColor: '#000000',
      shadowBlur: 4,
      padding: 12
    };
  }

  private getDefaultPosition(): SubtitlePosition {
    return {
      x: 50,
      y: 85,
      alignment: 'center',
      verticalAlignment: 'bottom'
    };
  }

  // Method to render subtitles on a video frame (for export)
  async renderSubtitleOnFrame(
    videoFrame: ImageBitmap | HTMLVideoElement | HTMLCanvasElement,
    subtitle: SubtitleSegment,
    currentTime: number
  ): Promise<ImageBitmap> {
    // Create temporary canvas for the frame
    let width: number;
    let height: number;
    
    if (videoFrame instanceof HTMLVideoElement) {
      width = videoFrame.videoWidth;
      height = videoFrame.videoHeight;
    } else if ('width' in videoFrame) {
      width = videoFrame.width;
      height = videoFrame.height;
    } else {
      throw new Error('Invalid video frame type');
    }
    
    const tempCanvas = new OffscreenCanvas(width, height);
    const tempCtx = tempCanvas.getContext('2d');
    
    if (!tempCtx) {
      throw new Error('Failed to create temp context');
    }

    // Draw video frame
    tempCtx.drawImage(videoFrame as any, 0, 0);

    // Set up temp renderer
    const tempRenderer = new SubtitleRenderer(tempCanvas as any);
    tempRenderer.renderSubtitle(
      subtitle,
      tempCanvas.width,
      tempCanvas.height,
      currentTime
    );

    // Return as ImageBitmap
    return createImageBitmap(tempCanvas);
  }

  // Batch render for performance
  renderSubtitles(
    subtitles: SubtitleSegment[],
    videoWidth: number,
    videoHeight: number,
    currentTime: number
  ) {
    this.clear();
    
    // Find all active subtitles at current time
    const activeSubtitles = subtitles.filter(
      sub => currentTime >= sub.startTime && currentTime <= sub.endTime
    );

    // Render each active subtitle
    activeSubtitles.forEach(subtitle => {
      this.renderSubtitle(subtitle, videoWidth, videoHeight, currentTime);
    });
  }

  destroy() {
    this.textCache.clear();
    this.offscreenCanvas = undefined;
    this.offscreenCtx = undefined;
  }
}

// Singleton instance manager
let rendererInstance: SubtitleRenderer | null = null;

export function getSubtitleRenderer(canvas: HTMLCanvasElement): SubtitleRenderer {
  if (!rendererInstance || rendererInstance.canvas !== canvas) {
    if (rendererInstance) {
      rendererInstance.destroy();
    }
    rendererInstance = new SubtitleRenderer(canvas);
  }
  return rendererInstance;
} 