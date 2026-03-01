import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile } from '@ffmpeg/util';
import type { SubtitleSegment } from '../types/caption-studio';

export class FastSubtitleEmbedService {
  private static instance: FastSubtitleEmbedService;
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;
  private loadingPromise: Promise<void> | null = null;

  private constructor() {
    // Singleton pattern
  }

  static getInstance(): FastSubtitleEmbedService {
    if (!FastSubtitleEmbedService.instance) {
      FastSubtitleEmbedService.instance = new FastSubtitleEmbedService();
    }
    return FastSubtitleEmbedService.instance;
  }

  /**
   * Pre-load FFmpeg to avoid delays during export
   */
  async preloadFFmpeg(): Promise<void> {
    if (this.loaded || this.loadingPromise) return;

    this.loadingPromise = this.loadFFmpegInternal();
    await this.loadingPromise;
  }

  private async loadFFmpegInternal(): Promise<void> {
    if (this.loaded && this.ffmpeg) return;

    console.log('[FastEmbed] Pre-loading FFmpeg...');
    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on('log', ({ message }) => {
      if (message.includes('Progress') || message.includes('frame=')) {
        // Reduce log noise
        return;
      }
      console.log('[FastEmbed]', message);
    });

    try {
      // Use the latest version with better performance
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      
      await this.ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });
      
      this.loaded = true;
      console.log('[FastEmbed] FFmpeg pre-loaded successfully');
      
    } catch (error) {
      console.error('[FastEmbed] Failed to load FFmpeg:', error);
      this.loadingPromise = null;
      throw error;
    }
  }

  /**
   * Enhanced subtitle embedding with validation and retry logic
   */
  async embedSubtitlesWithValidation(
    videoBlob: Blob,
    subtitles: SubtitleSegment[],
    format: 'mp4' | 'mkv' = 'mp4',
    onProgress?: (progress: number) => void
  ): Promise<{ blob: Blob; isValid: boolean; metadata?: any }> {
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      try {
        attempts++;
        console.log(`[FastEmbed] Embedding attempt ${attempts}/${maxAttempts}`);
        
        // Try embedding based on format
        let resultBlob: Blob;
        if (format === 'mkv') {
          resultBlob = await this.embedSubtitlesInMKV(videoBlob, subtitles, onProgress);
        } else {
          resultBlob = await this.embedSubtitlesInMP4(videoBlob, subtitles, onProgress);
        }
        
        // Validate the output
        const isValid = await this.validateVideoOutput(resultBlob);
        
        if (isValid) {
          console.log('[FastEmbed] Video validation passed');
          return { blob: resultBlob, isValid: true, metadata: { format, attempts } };
        } else {
          console.warn('[FastEmbed] Video validation failed, retrying...');
          if (attempts < maxAttempts) {
            // Try with MKV format on next attempt if MP4 failed
            if (format === 'mp4') {
              format = 'mkv';
              console.log('[FastEmbed] Switching to MKV format for next attempt');
            }
          }
        }
      } catch (error) {
        console.error(`[FastEmbed] Attempt ${attempts} failed:`, error);
        if (attempts >= maxAttempts) {
          throw new Error(`Failed to embed subtitles after ${maxAttempts} attempts: ${error instanceof Error ? error.message : String(error)}`);
        }
      }
    }
    
    throw new Error('Failed to produce valid video output');
  }

  /**
   * Validate video output to ensure it's not corrupted
   */
  private async validateVideoOutput(blob: Blob): Promise<boolean> {
    try {
      // Basic validation: check size
      if (blob.size < 1000) {
        console.error('[FastEmbed] Video too small, likely corrupted');
        return false;
      }
      
      // Try to create a video element and check if it can load metadata
      return new Promise((resolve) => {
        const video = document.createElement('video');
        const url = URL.createObjectURL(blob);
        
        const cleanup = () => {
          URL.revokeObjectURL(url);
          video.remove();
        };
        
        video.onloadedmetadata = () => {
          console.log('[FastEmbed] Video metadata loaded successfully');
          console.log(`[FastEmbed] Duration: ${video.duration}s, Size: ${(blob.size / 1024 / 1024).toFixed(2)}MB`);
          cleanup();
          resolve(video.duration > 0);
        };
        
        video.onerror = () => {
          console.error('[FastEmbed] Video validation failed - cannot load metadata');
          cleanup();
          resolve(false);
        };
        
        // Set timeout for validation
        setTimeout(() => {
          cleanup();
          resolve(false);
        }, 5000);
        
        video.src = url;
      });
    } catch (error) {
      console.error('[FastEmbed] Video validation error:', error);
      return false;
    }
  }

  /**
   * Fast subtitle embedding for MKV using stream copy
   */
  async embedSubtitlesInMKV(
    videoBlob: Blob,
    subtitles: SubtitleSegment[],
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    await this.preloadFFmpeg();
    const ffmpeg = this.ffmpeg!;

    try {
      console.log('[FastEmbed] Starting fast MKV subtitle embedding...');
      
      // Write video file
      const videoData = await fetchFile(videoBlob);
      await ffmpeg.writeFile('input.mp4', videoData);

      // Create optimized SRT subtitles
      const srtContent = this.createOptimizedSRT(subtitles);
      await ffmpeg.writeFile('subtitles.srt', srtContent);

      // Set up progress tracking
      let lastProgress = 0;
      ffmpeg.on('progress', ({ progress }) => {
        const progressPercent = Math.round(progress * 100);
        if (progressPercent !== lastProgress) {
          lastProgress = progressPercent;
          if (onProgress) onProgress(progressPercent);
        }
      });

      // Use ultra-fast stream copy for MKV
      const ffmpegArgs = [
        '-i', 'input.mp4',
        '-i', 'subtitles.srt',
        '-map', '0',           // Map all streams from input video
        '-map', '1',           // Map subtitle stream
        '-c', 'copy',          // Copy all codecs - NO RE-ENCODING!
        '-c:s', 'srt',         // Keep SRT format for subtitles
        '-metadata:s:s:0', 'language=eng',
        '-metadata:s:s:0', 'title=English',
        '-disposition:s:0', 'default',
        '-f', 'matroska',      // Force MKV format
        'output.mkv'
      ];

      console.log('[FastEmbed] Running stream copy command (ultra-fast)...');
      const startTime = performance.now();
      
      await ffmpeg.exec(ffmpegArgs);
      
      const endTime = performance.now();
      console.log(`[FastEmbed] Processing completed in ${((endTime - startTime) / 1000).toFixed(1)}s`);

      // Read output
      const data = await ffmpeg.readFile('output.mkv');
      const outputBlob = new Blob([data], { type: 'video/x-matroska' });

      console.log('[FastEmbed] Output size:', (outputBlob.size / 1024 / 1024).toFixed(2), 'MB');
      
      return outputBlob;

    } catch (error) {
      console.error('[FastEmbed] Fast embedding failed:', error);
      throw error;
    } finally {
      // Cleanup
      try {
        await ffmpeg.deleteFile('input.mp4');
        await ffmpeg.deleteFile('subtitles.srt');
        await ffmpeg.deleteFile('output.mkv');
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  /**
   * Fast subtitle embedding for MP4 with minimal re-encoding
   */
  async embedSubtitlesInMP4(
    videoBlob: Blob,
    subtitles: SubtitleSegment[],
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    await this.preloadFFmpeg();
    const ffmpeg = this.ffmpeg!;

    try {
      console.log('[FastEmbed] Starting fast MP4 subtitle embedding...');
      
      // Write video file
      const videoData = await fetchFile(videoBlob);
      await ffmpeg.writeFile('input.mp4', videoData);

      // Create WebVTT for MP4 compatibility
      const vttContent = this.createOptimizedVTT(subtitles);
      await ffmpeg.writeFile('subtitles.vtt', vttContent);

      // Set up progress tracking
      let lastProgress = 0;
      ffmpeg.on('progress', ({ progress }) => {
        const progressPercent = Math.round(progress * 100);
        if (progressPercent !== lastProgress) {
          lastProgress = progressPercent;
          if (onProgress) onProgress(progressPercent);
        }
      });

      // Use fast preset with stream copy for video/audio
      const ffmpegArgs = [
        '-i', 'input.mp4',
        '-i', 'subtitles.vtt',
        '-map', '0:v',         // Map video stream
        '-map', '0:a?',        // Map audio if exists
        '-map', '1',           // Map subtitle
        '-c:v', 'copy',        // Copy video stream - NO RE-ENCODING!
        '-c:a', 'copy',        // Copy audio stream - NO RE-ENCODING!
        '-c:s', 'mov_text',    // Convert subtitles to mov_text
        '-metadata:s:s:0', 'language=eng',
        '-metadata:s:s:0', 'handler_name=English',
        '-disposition:s:0', 'default',
        '-movflags', '+faststart', // Optimize for streaming
        '-f', 'mp4',
        'output.mp4'
      ];

      console.log('[FastEmbed] Running fast MP4 command...');
      const startTime = performance.now();
      
      await ffmpeg.exec(ffmpegArgs);
      
      const endTime = performance.now();
      console.log(`[FastEmbed] Processing completed in ${((endTime - startTime) / 1000).toFixed(1)}s`);

      // Read output
      const data = await ffmpeg.readFile('output.mp4');
      const outputBlob = new Blob([data], { type: 'video/mp4' });

      console.log('[FastEmbed] Output size:', (outputBlob.size / 1024 / 1024).toFixed(2), 'MB');
      
      return outputBlob;

    } catch (error) {
      console.error('[FastEmbed] MP4 embedding failed, trying compatibility mode...', error);
      
      // Fallback: minimal re-encoding for compatibility
      return this.embedSubtitlesMP4Compatibility(videoBlob, subtitles, onProgress);
    } finally {
      // Cleanup
      try {
        await ffmpeg.deleteFile('input.mp4');
        await ffmpeg.deleteFile('subtitles.vtt');
        await ffmpeg.deleteFile('output.mp4');
      } catch (e) {
        // Ignore
      }
    }
  }

  /**
   * Compatibility mode for MP4 when stream copy fails
   */
  private async embedSubtitlesMP4Compatibility(
    videoBlob: Blob,
    subtitles: SubtitleSegment[],
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    const ffmpeg = this.ffmpeg!;

    try {
      console.log('[FastEmbed] Using compatibility mode with ultrafast preset...');
      
      // Clean up any existing files first
      try {
        await ffmpeg.deleteFile('input.mp4');
        await ffmpeg.deleteFile('subtitles.vtt');
        await ffmpeg.deleteFile('output_compat.mp4');
      } catch (e) {
        // Ignore cleanup errors
      }
      
      // Re-write files if needed
      const videoData = await fetchFile(videoBlob);
      await ffmpeg.writeFile('input.mp4', videoData);

      const vttContent = this.createOptimizedVTT(subtitles);
      await ffmpeg.writeFile('subtitles.vtt', vttContent);

      // Use ultrafast preset for minimal encoding time
      const ffmpegArgs = [
        '-i', 'input.mp4',
        '-i', 'subtitles.vtt',
        '-map', '0:v',
        '-map', '0:a?',
        '-map', '1',
        '-c:v', 'libx264',
        '-preset', 'ultrafast',    // Fastest encoding preset
        '-crf', '23',              // Balanced quality
        '-tune', 'fastdecode',     // Optimize for fast decoding
        '-x264-params', 'ref=1:bframes=0', // Reduce complexity
        '-c:a', 'copy',            // Still copy audio
        '-c:s', 'mov_text',
        '-metadata:s:s:0', 'language=eng',
        '-disposition:s:0', 'default',
        '-movflags', '+faststart',
        '-threads', '0',           // Use all CPU threads
        'output_compat.mp4'
      ];

      await ffmpeg.exec(ffmpegArgs);

      const data = await ffmpeg.readFile('output_compat.mp4');
      await ffmpeg.deleteFile('output_compat.mp4');
      
      return new Blob([data], { type: 'video/mp4' });

    } catch (error) {
      console.error('[FastEmbed] Compatibility mode also failed:', error);
      throw new Error('Failed to embed subtitles. Try using MKV format for better compatibility.');
    }
  }

  /**
   * Create optimized SRT with minimal overhead
   */
  private createOptimizedSRT(subtitles: SubtitleSegment[]): string {
    return subtitles
      .sort((a, b) => a.startTime - b.startTime)
      .map((subtitle, index) => {
        const start = this.formatSRTTime(subtitle.startTime);
        const end = this.formatSRTTime(subtitle.endTime);
        return `${index + 1}\n${start} --> ${end}\n${subtitle.text}`;
      })
      .join('\n\n');
  }

  /**
   * Create optimized WebVTT
   */
  private createOptimizedVTT(subtitles: SubtitleSegment[]): string {
    let vtt = 'WEBVTT\n\n';
    
    subtitles
      .sort((a, b) => a.startTime - b.startTime)
      .forEach((subtitle) => {
        const start = this.formatVTTTime(subtitle.startTime);
        const end = this.formatVTTTime(subtitle.endTime);
        vtt += `${start} --> ${end}\n${subtitle.text}\n\n`;
      });
    
    return vtt;
  }

  private formatSRTTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
  }

  private formatVTTTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(3, '0')}`;
  }

  /**
   * Get recommended format based on requirements
   */
  getRecommendedFormat(requirements: {
    compatibility: 'high' | 'medium' | 'low';
    speed: 'fast' | 'normal';
  }): 'mkv' | 'mp4' {
    if (requirements.speed === 'fast') {
      return 'mkv'; // MKV allows stream copy without re-encoding
    }
    if (requirements.compatibility === 'high') {
      return 'mp4'; // MP4 has better player support
    }
    return 'mkv'; // Default to MKV for best performance
  }

  /**
   * Cleanup resources
   */
  async cleanup(): Promise<void> {
    if (this.ffmpeg) {
      try {
        this.ffmpeg.terminate();
      } catch (e) {
        // Ignore
      }
      this.ffmpeg = null;
      this.loaded = false;
      this.loadingPromise = null;
    }
  }
}

export const fastSubtitleEmbedService = FastSubtitleEmbedService.getInstance(); 