import type { SubtitleSegment, VideoExportOptions } from '../types/caption-studio';
import { SubtitleRenderer } from './subtitle-renderer.service';

export class CanvasVideoExportService {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private subtitleRenderer: SubtitleRenderer | null = null;

  async exportVideoWithBurnedSubtitles(
    videoElement: HTMLVideoElement,
    subtitles: SubtitleSegment[],
    options: VideoExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log('[CanvasExport] Starting video export with burned subtitles');
    
    // Create canvas matching video dimensions
    this.canvas = document.createElement('canvas');
    this.canvas.width = videoElement.videoWidth;
    this.canvas.height = videoElement.videoHeight;
    this.ctx = this.canvas.getContext('2d', { 
      willReadFrequently: true,
      desynchronized: true 
    });
    
    if (!this.ctx) {
      throw new Error('Failed to get canvas context');
    }

    // Create subtitle canvas
    const subtitleCanvas = document.createElement('canvas');
    subtitleCanvas.width = this.canvas.width;
    subtitleCanvas.height = this.canvas.height;
    this.subtitleRenderer = new SubtitleRenderer(subtitleCanvas);

    // Configure media recorder with optimal settings
    const stream = this.canvas.captureStream(options.fps || 30);
    
    // Add audio track from video if available
    try {
      const audioStream = (videoElement as any).captureStream?.();
      if (audioStream) {
        const audioTracks = audioStream.getAudioTracks();
        audioTracks.forEach((track: MediaStreamTrack) => stream.addTrack(track));
      }
    } catch (e) {
      console.warn('[CanvasExport] Could not capture audio:', e);
    }

    // Determine best mime type
    const mimeTypes = this.getSupportedMimeTypes(options.format || 'mp4');
    let selectedMimeType = mimeTypes[0];
    
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        break;
      }
    }

    console.log('[CanvasExport] Using mime type:', selectedMimeType);

    // Configure recorder with quality settings
    const bitrate = this.calculateBitrate(options.quality || 'high', videoElement);
    const recorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      videoBitsPerSecond: bitrate,
      audioBitsPerSecond: 192000
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    // Start recording
    recorder.start();
    
    // Render video frame by frame
    const fps = options.fps || 30;
    const duration = videoElement.duration;
    const totalFrames = Math.ceil(duration * fps);
    let currentFrame = 0;
    
    // Pause video for frame-by-frame processing
    videoElement.pause();
    
    const renderFrame = async () => {
      if (currentFrame >= totalFrames) {
        // Finish recording
        recorder.stop();
        return;
      }

      const currentTime = currentFrame / fps;
      
      // Seek to exact frame time
      videoElement.currentTime = currentTime;
      
      // Wait for seek to complete
      await new Promise<void>((resolve) => {
        const seekHandler = () => {
          videoElement.removeEventListener('seeked', seekHandler);
          resolve();
        };
        videoElement.addEventListener('seeked', seekHandler);
      });

      // Draw video frame
      this.ctx!.drawImage(videoElement, 0, 0, this.canvas!.width, this.canvas!.height);
      
      // Render subtitles for current time
      const activeSubtitles = subtitles.filter(
        sub => currentTime >= sub.startTime && currentTime <= sub.endTime
      );
      
      if (activeSubtitles.length > 0) {
        // Clear subtitle canvas before rendering
        this.subtitleRenderer!.clear();
        
        // Render each active subtitle
        activeSubtitles.forEach(subtitle => {
          this.subtitleRenderer!.renderSubtitle(subtitle, this.canvas!.width, this.canvas!.height, currentTime);
        });
        
        // Draw subtitle canvas on top of video
        this.ctx!.drawImage(this.subtitleRenderer!.canvas, 0, 0);
      }

      // Update progress
      const progress = Math.round((currentFrame / totalFrames) * 100);
      onProgress?.(progress);
      
      currentFrame++;
      
      // Process next frame
      requestAnimationFrame(() => renderFrame());
    };

    // Start rendering
    renderFrame();

    // Wait for recording to finish
    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        console.log('[CanvasExport] Recording complete, creating blob');
        
        // Cleanup
        this.cleanup();
        
        // Create final blob
        const blob = new Blob(chunks, { type: selectedMimeType });
        console.log('[CanvasExport] Export complete:', {
          size: `${(blob.size / 1024 / 1024).toFixed(2)}MB`,
          type: blob.type
        });
        
        resolve(blob);
      };
      
      recorder.onerror = (event) => {
        console.error('[CanvasExport] Recording error:', event);
        this.cleanup();
        reject(new Error('Failed to record video'));
      };
    });
  }

  async exportVideoWithEmbeddedSubtitles(
    videoBlob: Blob,
    subtitles: SubtitleSegment[],
    options: VideoExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log('[CanvasExport] Embedded subtitles not supported, falling back to burned subtitles');
    
    // Create video element from blob
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
    });
    
    try {
      const result = await this.exportVideoWithBurnedSubtitles(video, subtitles, options, onProgress);
      URL.revokeObjectURL(video.src);
      return result;
    } catch (error) {
      URL.revokeObjectURL(video.src);
      throw error;
    }
  }

  private getSupportedMimeTypes(format: string): string[] {
    if (format === 'webm') {
      return [
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
    } else {
      return [
        'video/mp4;codecs=h264,aac',
        'video/mp4;codecs=avc1,mp4a',
        'video/mp4;codecs=avc1',
        'video/mp4'
      ];
    }
  }

  private calculateBitrate(quality: string, video: HTMLVideoElement): number {
    const baseRate = video.videoWidth * video.videoHeight;
    
    switch (quality) {
      case 'low':
        return Math.round(baseRate * 0.5);
      case 'medium':
        return Math.round(baseRate * 1);
      case 'high':
        return Math.round(baseRate * 2);
      case 'ultra':
        return Math.round(baseRate * 3);
      default:
        return Math.round(baseRate * 1.5);
    }
  }

  private cleanup() {
    if (this.canvas) {
      this.canvas.remove();
      this.canvas = null;
    }
    this.ctx = null;
    this.subtitleRenderer = null;
  }

  async verifyVideoQuality(videoBlob: Blob): Promise<{
    hasSubtitles: boolean;
    duration: number;
    width: number;
    height: number;
    size: number;
    isPlayable: boolean;
    error?: string;
  }> {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    
    return new Promise((resolve) => {
      const result = {
        hasSubtitles: false,
        duration: 0,
        width: 0,
        height: 0,
        size: videoBlob.size,
        isPlayable: false,
        error: undefined as string | undefined
      };
      
      video.onloadedmetadata = () => {
        result.duration = video.duration;
        result.width = video.videoWidth;
        result.height = video.videoHeight;
        result.isPlayable = true;
        
        // Try to play a bit to verify
        video.play().then(() => {
          setTimeout(() => {
            video.pause();
            URL.revokeObjectURL(video.src);
            resolve(result);
          }, 100);
        }).catch((error) => {
          result.error = error.message;
          URL.revokeObjectURL(video.src);
          resolve(result);
        });
      };
      
      video.onerror = () => {
        result.error = 'Failed to load video';
        URL.revokeObjectURL(video.src);
        resolve(result);
      };
    });
  }
}

export const canvasVideoExportService = new CanvasVideoExportService(); 