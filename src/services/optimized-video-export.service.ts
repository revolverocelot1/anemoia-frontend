import type { SubtitleSegment, VideoExportOptions } from '../types/caption-studio';
import { canvasVideoExportService } from './canvas-video-export.service';
import { ffmpegVideoExportService } from './ffmpeg-video-export.service';
import { createOffscreenSubtitleRenderer } from './offscreen-subtitle-renderer.service';
import { simpleSubtitleEmbedService } from './simple-subtitle-embed.service';
import { fastSubtitleEmbedService } from './fast-subtitle-embed.service';

export class OptimizedVideoExportService {
  private offscreenRenderer: ReturnType<typeof createOffscreenSubtitleRenderer> | null = null;
  
  async exportVideo(
    videoElement: HTMLVideoElement,
    subtitles: SubtitleSegment[],
    options: VideoExportOptions & { embedType?: 'burn' | 'track' | 'embed-first' },
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log('[OptimizedExport] Starting export with options:', options);
    console.log('[OptimizedExport] Subtitles to process:', subtitles.length);
    console.log('[OptimizedExport] Embed type:', options.embedType);
    
    try {
      // Get video blob first
      const videoBlob = await this.getVideoBlob(videoElement);
      
      // New option: Try embedding first, fall back to burning if it fails
      if ((options.embedType as string) === 'embed-first') {
        console.log('[OptimizedExport] Trying to embed subtitles first...');
        try {
          const result = await fastSubtitleEmbedService.embedSubtitlesWithValidation(
            videoBlob,
            subtitles,
            options.format === 'mkv' ? 'mkv' : 'mp4',
            onProgress
          );
          
          if (result.isValid) {
            console.log('[OptimizedExport] Successfully embedded subtitles');
            return result.blob;
          }
        } catch (embedError) {
          console.warn('[OptimizedExport] Embedding failed, falling back to burning:', embedError);
          // Fall through to burning
          options.embedType = 'burn';
        }
      }
      
      // For burning subtitles, use FFmpeg directly
      if (options.embedType === 'burn' || options.burnSubtitles) {
        console.log('[OptimizedExport] Using FFmpeg for burned subtitles');
        return await this.exportWithBurnedSubtitles(videoElement, subtitles, options, onProgress);
      }
      
      // For embedding subtitle tracks, use fast subtitle embed service
      if (options.embedType === 'track' || options.embedSubtitles) {
        console.log('[OptimizedExport] Using fast subtitle embedding service');
        
        // Pre-load FFmpeg to avoid delays
        await fastSubtitleEmbedService.preloadFFmpeg();
        
        // Use the validated embedding method
        const result = await fastSubtitleEmbedService.embedSubtitlesWithValidation(
          videoBlob,
          subtitles,
          options.format === 'mkv' ? 'mkv' : 'mp4',
          onProgress
        );
        
        if (!result.isValid) {
          throw new Error('Failed to produce valid video output with embedded subtitles');
        }
        
        return result.blob;
      }
      
      // Default: return the original video with warning
      console.warn('[OptimizedExport] No subtitle processing requested, returning original video');
      if (onProgress) onProgress(100);
      return videoBlob;
      
    } catch (error) {
      console.error('[OptimizedExport] Export failed:', error);
      throw error;
    }
  }
  
  private async exportWithBurnedSubtitles(
    videoElement: HTMLVideoElement,
    subtitles: SubtitleSegment[],
    options: VideoExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    try {
      // Check video resolution
      const width = videoElement.videoWidth;
      const height = videoElement.videoHeight;
    
      console.log(`[OptimizedExport] Video dimensions: ${width}x${height}`);
      
      // For high resolutions or if canvas fails, use FFmpeg
      if (width > 1920 || height > 1920) {
        console.log('[OptimizedExport] High resolution detected, using FFmpeg for burning');
        await ffmpegVideoExportService.loadFFmpeg();
        const videoBlob = await this.getVideoBlob(videoElement);
        return await ffmpegVideoExportService.exportVideoWithBurnedSubtitles(
          videoBlob,
          subtitles,
          options,
          onProgress
        );
      }
      
      // Use canvas for normal resolutions
      console.log('[OptimizedExport] Using optimized canvas export');
      
      // Initialize offscreen renderer if not already done
      if (!this.offscreenRenderer) {
        this.offscreenRenderer = createOffscreenSubtitleRenderer();
        }
        
      // Use canvas service with offscreen rendering
      return await canvasVideoExportService.exportVideoWithBurnedSubtitles(
        videoElement,
        subtitles,
        options,
        onProgress
      );
      
    } catch (error) {
      console.error('[OptimizedExport] Burned subtitle export failed:', error);
      throw error;
    }
  }
  
  private async exportWithEmbeddedTrack(
    videoElement: HTMLVideoElement,
    subtitles: SubtitleSegment[],
    options: VideoExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    try {
      const videoBlob = await this.getVideoBlob(videoElement);
      
      console.log('[OptimizedExport] Attempting FFmpeg subtitle track embedding...');
      
      // Check if FFmpeg is available
      try {
        await ffmpegVideoExportService.loadFFmpeg();
      } catch (loadError) {
        console.error('[OptimizedExport] Failed to load FFmpeg:', loadError);
        throw new Error('FFmpeg failed to load. Subtitle embedding requires FFmpeg.');
      }
      
      // Try to embed subtitles
      const result = await ffmpegVideoExportService.exportVideoWithSubtitleTrack(
        videoBlob,
        subtitles,
        options,
        onProgress
      );
      
      console.log('[OptimizedExport] Subtitle track embedded successfully');
      return result;
      
    } catch (error) {
      console.error('[OptimizedExport] Embedded track export failed:', error);
      
      // Provide helpful error message
      if (error instanceof Error) {
        if (error.message.includes('FFmpeg')) {
          throw new Error('Failed to embed subtitles: FFmpeg not available or encountered an error. Please try burning subtitles instead.');
        }
        throw new Error(`Failed to embed subtitles: ${error.message}`);
      }
      
      throw new Error('Failed to embed subtitles. Please try burning subtitles instead.');
    }
  }
  
  private async getVideoBlob(videoElement: HTMLVideoElement): Promise<Blob> {
    // If the video has a source that's a blob URL, fetch it
    if (videoElement.src && videoElement.src.startsWith('blob:')) {
      const response = await fetch(videoElement.src);
      return await response.blob();
    }
    
    // Otherwise, try to get the original file if available
    const videoFile = (videoElement as any).videoFile;
    if (videoFile instanceof File || videoFile instanceof Blob) {
      return videoFile;
  }
  
    // As a last resort, throw an error
    throw new Error('Unable to get video blob from element');
  }
  
  // Cleanup method
  cleanup(): void {
    if (this.offscreenRenderer) {
      this.offscreenRenderer.destroy();
      this.offscreenRenderer = null;
    }
  }
}

export const optimizedVideoExportService = new OptimizedVideoExportService(); 