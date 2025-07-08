import type { SubtitleProject, SubtitleSegment, SubtitleTrack } from '../types/subtitle';

export interface ExportOptions {
  quality?: number;
  fps?: number;
  burnSubtitles?: boolean;
  selectedTrackIds?: string[];
}

export class VideoExporter {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private video: HTMLVideoElement;
  
  constructor() {
    this.canvas = document.createElement('canvas');
    this.ctx = this.canvas.getContext('2d', { alpha: false })!;
    this.video = document.createElement('video');
  }
  
  async exportWithSubtitles(
    project: SubtitleProject,
    options: ExportOptions = {}
  ): Promise<Blob> {
    const {
      quality = 0.9,
      fps = 30,
      burnSubtitles = true,
      selectedTrackIds = project.tracks.map(t => t.id)
    } = options;
    
    // Load video
    if (project.videoFile) {
      this.video.src = URL.createObjectURL(project.videoFile);
    } else if (project.videoUrl) {
      this.video.src = project.videoUrl;
    } else {
      throw new Error('No video source available');
    }
    
    // Wait for video to load
    await new Promise((resolve, reject) => {
      this.video.onloadedmetadata = resolve;
      this.video.onerror = reject;
    });
    
    // Set canvas dimensions
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;
    
    // Get tracks to render
    const tracksToRender = project.tracks.filter(
      track => selectedTrackIds.includes(track.id) && track.visible
    );
    
    // Create MediaRecorder
    const stream = this.canvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 5000000 // 5 Mbps
    });
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    // Start recording
    mediaRecorder.start();
    
    // Render video with subtitles
    await this.renderVideoWithSubtitles(
      project.videoDuration,
      tracksToRender,
      fps,
      burnSubtitles
    );
    
    // Stop recording
    mediaRecorder.stop();
    
    // Wait for recording to finish
    await new Promise<void>((resolve) => {
      mediaRecorder.onstop = () => resolve();
    });
    
    // Combine chunks into final video
    const finalBlob = new Blob(chunks, { type: 'video/webm' });
    
    // Cleanup
    if (project.videoFile) {
      URL.revokeObjectURL(this.video.src);
    }
    
    return finalBlob;
  }
  
  private async renderVideoWithSubtitles(
    duration: number,
    tracks: SubtitleTrack[],
    fps: number,
    burnSubtitles: boolean
  ): Promise<void> {
    const frameInterval = 1000 / fps;
    let currentTime = 0;
    
    return new Promise((resolve) => {
      const renderFrame = () => {
        if (currentTime > duration) {
          resolve();
          return;
        }
        
        // Seek video to current time
        this.video.currentTime = currentTime;
        
        // Wait for seek to complete
        this.video.onseeked = () => {
          // Draw video frame
          this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
          
          // Draw subtitles if enabled
          if (burnSubtitles) {
            this.drawSubtitles(tracks, currentTime);
          }
          
          // Move to next frame
          currentTime += frameInterval / 1000;
          
          // Schedule next frame
          setTimeout(renderFrame, 0);
        };
      };
      
      // Start rendering
      renderFrame();
    });
  }
  
  private drawSubtitles(tracks: SubtitleTrack[], currentTime: number): void {
    tracks.forEach(track => {
      // Find active segment
      const activeSegment = track.segments.find(
        segment => currentTime >= segment.startTime && currentTime <= segment.endTime
      );
      
      if (!activeSegment) return;
      
      const style = track.style;
      const position = track.position;
      
      // Calculate position
      let x: number, y: number, width: number, height: number;
      
      if (position.unit === 'pixels') {
        x = position.x;
        y = position.y;
        width = position.width;
        height = position.height;
      } else {
        // Convert percentage to pixels
        x = (position.x / 100) * this.canvas.width;
        y = (position.y / 100) * this.canvas.height;
        width = (position.width / 100) * this.canvas.width;
        height = (position.height / 100) * this.canvas.height;
      }
      
      // Set up text rendering
      this.ctx.save();
      
      // Font settings
      this.ctx.font = `${style.fontStyle} ${style.fontWeight} ${style.fontSize}px ${style.fontFamily}`;
      this.ctx.textAlign = style.textAlign;
      this.ctx.textBaseline = 'middle';
      
      // Background
      if (style.backgroundColor) {
        this.ctx.fillStyle = style.backgroundColor + 
          Math.round((style.backgroundOpacity || 1) * 255).toString(16).padStart(2, '0');
        
        const padding = style.padding || 0;
        this.ctx.fillRect(
          x - padding,
          y - padding,
          width + padding * 2,
          height + padding * 2
        );
      }
      
      // Text shadow
      if (style.shadowColor) {
        this.ctx.shadowColor = style.shadowColor;
        this.ctx.shadowOffsetX = style.shadowOffsetX || 0;
        this.ctx.shadowOffsetY = style.shadowOffsetY || 0;
        this.ctx.shadowBlur = style.shadowBlur || 0;
      }
      
      // Text stroke
      if (style.strokeWidth && style.strokeColor) {
        this.ctx.strokeStyle = style.strokeColor;
        this.ctx.lineWidth = style.strokeWidth;
        this.ctx.strokeText(activeSegment.text, x + width / 2, y + height / 2);
      }
      
      // Text fill
      this.ctx.fillStyle = style.color;
      this.ctx.fillText(activeSegment.text, x + width / 2, y + height / 2);
      
      this.ctx.restore();
    });
  }
  
  /**
   * Export subtitles only (without video)
   */
  async exportSubtitlesAsVideo(
    project: SubtitleProject,
    backgroundColor: string = '#000000',
    duration?: number
  ): Promise<Blob> {
    const videoDuration = duration || project.videoDuration;
    const fps = 30;
    
    // Set canvas to HD resolution
    this.canvas.width = 1920;
    this.canvas.height = 1080;
    
    // Create MediaRecorder
    const stream = this.canvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, {
      mimeType: 'video/webm;codecs=vp9',
      videoBitsPerSecond: 2000000 // 2 Mbps
    });
    
    const chunks: Blob[] = [];
    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };
    
    // Start recording
    mediaRecorder.start();
    
    // Render subtitles on solid background
    const frameInterval = 1000 / fps;
    let currentTime = 0;
    
    while (currentTime <= videoDuration) {
      // Clear canvas with background color
      this.ctx.fillStyle = backgroundColor;
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Draw subtitles
      this.drawSubtitles(project.tracks.filter(t => t.visible), currentTime);
      
      // Wait for frame interval
      await new Promise(resolve => setTimeout(resolve, frameInterval));
      
      currentTime += frameInterval / 1000;
    }
    
    // Stop recording
    mediaRecorder.stop();
    
    // Wait for recording to finish
    await new Promise<void>((resolve) => {
      mediaRecorder.onstop = () => resolve();
    });
    
    // Combine chunks
    return new Blob(chunks, { type: 'video/webm' });
  }
  
  /**
   * Create preview thumbnail at specific time
   */
  async createThumbnail(
    project: SubtitleProject,
    time: number,
    width: number = 320,
    height: number = 180
  ): Promise<string> {
    // Load video
    if (project.videoFile) {
      this.video.src = URL.createObjectURL(project.videoFile);
    } else if (project.videoUrl) {
      this.video.src = project.videoUrl;
    } else {
      throw new Error('No video source available');
    }
    
    // Wait for video to load
    await new Promise((resolve, reject) => {
      this.video.onloadedmetadata = resolve;
      this.video.onerror = reject;
    });
    
    // Set canvas dimensions
    this.canvas.width = width;
    this.canvas.height = height;
    
    // Seek to time
    this.video.currentTime = time;
    
    // Wait for seek
    await new Promise((resolve) => {
      this.video.onseeked = resolve;
    });
    
    // Draw frame
    this.ctx.drawImage(this.video, 0, 0, width, height);
    
    // Draw subtitles
    const scale = width / this.video.videoWidth;
    this.ctx.save();
    this.ctx.scale(scale, scale);
    this.drawSubtitles(project.tracks.filter(t => t.visible), time);
    this.ctx.restore();
    
    // Get data URL
    const dataUrl = this.canvas.toDataURL('image/jpeg', 0.8);
    
    // Cleanup
    if (project.videoFile) {
      URL.revokeObjectURL(this.video.src);
    }
    
    return dataUrl;
  }
  
  dispose(): void {
    this.canvas.remove();
    this.video.remove();
  }
}

export const videoExporter = new VideoExporter(); 