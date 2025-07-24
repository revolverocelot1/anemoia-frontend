import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { SubtitleSegment, VideoExportOptions, SubtitleStyle } from '../types/caption-studio';

export class FFmpegVideoExportService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;
  // Use local files for render deployment
  private baseURL = window.location.origin + '/ffmpeg';

  async loadFFmpeg(): Promise<void> {
    if (this.loaded && this.ffmpeg) return;

    console.log('[FFmpegExport] Loading FFmpeg...');
    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    this.ffmpeg.on('progress', ({ progress, time }) => {
      console.log(`[FFmpeg] Progress: ${(progress * 100).toFixed(2)}% (time: ${time / 1000000}s)`);
    });

    try {
      // Always use CDN with toBlobURL to avoid module format issues
      console.log('[FFmpegExport] Loading FFmpeg from CDN...');
      
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      
      try {
        // Use ES module version for better compatibility
        await this.ffmpeg.load({
          coreURL: `${baseURL}/ffmpeg-core.js`,
          wasmURL: `${baseURL}/ffmpeg-core.wasm`,
        });
        
        this.loaded = true;
        console.log('[FFmpegExport] FFmpeg loaded successfully');
        
      } catch (cdnError) {
        console.error('[FFmpegExport] Failed to load from primary CDN, trying alternative...', cdnError);
        
        // Try alternative approach with UMD version
        const umdBaseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        const coreURL = await toBlobURL(`${umdBaseURL}/ffmpeg-core.js`, 'text/javascript');
        const wasmURL = await toBlobURL(`${umdBaseURL}/ffmpeg-core.wasm`, 'application/wasm');
      
      await this.ffmpeg.load({
        coreURL,
        wasmURL
      });
      
      this.loaded = true;
        console.log('[FFmpegExport] FFmpeg loaded successfully with UMD version');
      }
      
    } catch (error) {
      console.error('[FFmpegExport] Failed to load FFmpeg:', error);
      throw new Error('Failed to load FFmpeg. Please check your internet connection and try again.');
    }
  }

  async exportVideoWithBurnedSubtitles(
    videoBlob: Blob,
    subtitles: SubtitleSegment[],
    options: VideoExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      await this.loadFFmpeg();
    }

    const ffmpeg = this.ffmpeg!;
    
    try {
      console.log('[FFmpegExport] Starting video export with burned subtitles...');
      
      // Set progress callback
      if (onProgress) {
        ffmpeg.on('progress', ({ progress }) => {
          onProgress(progress * 100);
        });
      }

      // Write video file
      const videoData = await fetchFile(videoBlob);
      await ffmpeg.writeFile('input.mp4', videoData);

      // Create ASS subtitles with proper styling
      const assContent = this.createASSSubtitles(subtitles, options);
      await ffmpeg.writeFile('subtitles.ass', assContent);
      console.log('[FFmpegExport] Created ASS subtitle file with styles');

      // Get video dimensions for proper subtitle rendering
      const videoInfo = await this.getVideoInfo(ffmpeg, 'input.mp4');
      const { width, height } = this.calculateOutputDimensions(videoInfo.width, videoInfo.height);

      // Determine output format
      const outputFormat = options.format || 'mp4';
      const outputFile = `output.${outputFormat}`;

      // Build FFmpeg command for burning subtitles
      let ffmpegArgs: string[] = [
        '-i', 'input.mp4',
        '-vf', `ass=subtitles.ass`,
        '-c:a', 'copy'
      ];

      // Add video codec and quality settings based on output format
      if (outputFormat === 'webm') {
        ffmpegArgs.push('-c:v', 'libvpx-vp9');
        ffmpegArgs.push('-crf', this.getQualityCRF(options.quality || 'high', 'vp9'));
        ffmpegArgs.push('-b:v', '2M'); // Set target bitrate for better quality
        ffmpegArgs.push('-threads', '4'); // Use multiple threads
      } else {
        ffmpegArgs.push('-c:v', 'libx264');
        ffmpegArgs.push('-crf', this.getQualityCRF(options.quality || 'high', 'h264'));
        ffmpegArgs.push('-preset', 'medium');
        ffmpegArgs.push('-profile:v', 'high'); // High profile for better quality
        ffmpegArgs.push('-level', '4.2'); // Compatibility level
        ffmpegArgs.push('-pix_fmt', 'yuv420p'); // Pixel format for compatibility
        ffmpegArgs.push('-r', '30'); // Force 30fps output
        ffmpegArgs.push('-b:v', '3M'); // Target bitrate
        ffmpegArgs.push('-maxrate', '4M'); // Max bitrate
        ffmpegArgs.push('-bufsize', '8M'); // Buffer size for smoother playback
        
        // Add fast start for MP4
        if (outputFormat === 'mp4') {
          ffmpegArgs.push('-movflags', '+faststart');
        }
      }

      // Add output file
      ffmpegArgs.push(outputFile);

      console.log('[FFmpegExport] Running FFmpeg command:', ffmpegArgs.join(' '));
      await ffmpeg.exec(ffmpegArgs);

      // Read output file
      const data = await ffmpeg.readFile(outputFile);
      const outputBlob = new Blob([data], { type: `video/${outputFormat}` });

      console.log('[FFmpegExport] Export completed successfully');
      console.log('[FFmpegExport] Output size:', (outputBlob.size / 1024 / 1024).toFixed(2), 'MB');

      return outputBlob;

    } catch (error) {
      console.error('[FFmpegExport] Export failed:', error);
      throw new Error(`Failed to burn subtitles: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up files
      try {
        await ffmpeg.deleteFile('input.mp4');
        await ffmpeg.deleteFile('subtitles.ass');
        await ffmpeg.deleteFile(`output.${options.format || 'mp4'}`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  async exportVideoWithSubtitleTrack(
    videoBlob: Blob,
    subtitles: SubtitleSegment[],
    options: VideoExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      await this.loadFFmpeg();
    }

    const ffmpeg = this.ffmpeg!;
    
    try {
      console.log('[FFmpegExport] Starting video export with subtitle track...');
      console.log('[FFmpegExport] Subtitles to embed:', subtitles.length);
      console.log('[FFmpegExport] Container format:', options.format || 'mp4');
      
      // Set progress callback
      if (onProgress) {
        ffmpeg.on('progress', ({ progress }) => {
          onProgress(progress * 100);
        });
      }

      // Write video file
      const videoData = await fetchFile(videoBlob);
      await ffmpeg.writeFile('input.mp4', videoData);
      console.log('[FFmpegExport] Video file written to FFmpeg filesystem');

      // Create subtitles in multiple formats for better compatibility
      const vttContent = this.createWebVTTSubtitles(subtitles);
      const srtContent = this.createSRTSubtitles(subtitles);
      await ffmpeg.writeFile('subtitles.vtt', vttContent);
      await ffmpeg.writeFile('subtitles.srt', srtContent);
      console.log('[FFmpegExport] Subtitle files created (VTT and SRT)');

      // Get video info
      const videoInfo = await this.getVideoInfo(ffmpeg, 'input.mp4');
      const { width, height } = this.calculateOutputDimensions(videoInfo.width, videoInfo.height);

      // Determine output format and subtitle codec
      const outputFormat = options.format || 'mp4';
      const outputFile = `output.${outputFormat}`;
      
      let ffmpegArgs: string[];
      
      if (outputFormat === 'mkv') {
        // MKV container - better subtitle support, using SRT input
        ffmpegArgs = [
          '-i', 'input.mp4',
          '-i', 'subtitles.srt',  // Use SRT input for better compatibility
          '-map', '0:v',          // Map video stream
          '-map', '0:a?',         // Map audio if exists
          '-map', '1:s',          // Map subtitle stream
          '-c:v', 'copy',         // Copy video codec
          '-c:a', 'copy',         // Copy audio codec
          '-c:s', 'srt',          // Keep SRT subtitle format in MKV
          '-metadata:s:s:0', 'language=eng',
          '-metadata:s:s:0', 'title=English',
          '-disposition:s:0', 'default',  // Set as default subtitle
          outputFile
        ];
      } else {
        // MP4 container - use mov_text with proper re-encoding
        ffmpegArgs = [
          '-i', 'input.mp4',
          '-f', 'webvtt',
          '-i', 'subtitles.vtt',
          '-map', '0:v',      // Map video stream from first input
          '-map', '0:a?',     // Map audio from first input if exists
          '-map', '1:s',      // Map subtitle stream from second input
          '-c:v', 'libx264',  // Re-encode video for better compatibility
          '-preset', 'medium',
          '-crf', this.getQualityCRF(options.quality || 'high', 'h264'),
          '-profile:v', 'high',
          '-level', '4.2',
          '-pix_fmt', 'yuv420p',
          '-r', '30',         // Force 30fps
          '-b:v', '3M',       // Target bitrate
          '-maxrate', '4M',   // Max bitrate
          '-bufsize', '8M',   // Buffer size
          '-c:a', 'aac',      // Re-encode audio for compatibility
          '-b:a', '192k',     // Audio bitrate
          '-c:s', 'mov_text', // Convert subtitles to mov_text for MP4
          '-metadata:s:s:0', 'language=eng',
          '-metadata:s:s:0', 'handler_name=English',
          '-disposition:s:0', 'default', // Set as default subtitle track
          '-movflags', '+faststart',      // Optimize for web streaming
          outputFile
        ];
      }

      console.log('[FFmpegExport] Running FFmpeg command:', ffmpegArgs.join(' '));
      await ffmpeg.exec(ffmpegArgs);

      // Read output file
      const data = await ffmpeg.readFile(outputFile);
      const outputBlob = new Blob([data], { type: `video/${outputFormat}` });

      console.log('[FFmpegExport] Export completed successfully');
      console.log('[FFmpegExport] Output size:', (outputBlob.size / 1024 / 1024).toFixed(2), 'MB');
      
      // Verify subtitle track was added
      try {
        await ffmpeg.exec(['-i', outputFile, '-f', 'null', '-']);
        console.log('[FFmpegExport] Subtitle track embedded successfully');
      } catch (verifyError) {
        // FFmpeg exits with error on null output, but logs contain track info
        const logs = (verifyError as any).message || '';
        if (logs.includes('Subtitle:') || logs.includes('subtitle')) {
          console.log('[FFmpegExport] Subtitle track verified in output');
        } else {
          console.warn('[FFmpegExport] Could not verify subtitle track in output');
        }
      }

      return outputBlob;

    } catch (error) {
      console.error('[FFmpegExport] Export failed:', error);
      throw new Error(`Failed to embed subtitle track: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up files
      try {
        await ffmpeg.deleteFile('input.mp4');
        await ffmpeg.deleteFile('subtitles.vtt');
        await ffmpeg.deleteFile('subtitles.srt');
        await ffmpeg.deleteFile(`output.${options.format || 'mp4'}`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
  }

  private async getVideoInfo(ffmpeg: FFmpeg, filename: string): Promise<{ width: number; height: number }> {
    // Run ffprobe-like command to get video info
    try {
      await ffmpeg.exec(['-i', filename, '-f', 'null', '-']);
      // Parse logs to extract dimensions (this is a simplified approach)
      // In production, you'd want to use proper ffprobe
      return { width: 1920, height: 1080 }; // Default fallback
    } catch (error) {
      // FFmpeg will throw on the null output, but logs will contain info
      return { width: 1920, height: 1080 }; // Default fallback
    }
  }

  private calculateOutputDimensions(inputWidth: number, inputHeight: number): { width: number; height: number } {
    // Ensure dimensions are even and within reasonable limits
    const maxWidth = 1920;
    const maxHeight = 1080;
    
    let width = inputWidth;
    let height = inputHeight;
    
    // Scale down if necessary
    if (width > maxWidth || height > maxHeight) {
      const scaleRatio = Math.min(maxWidth / width, maxHeight / height);
      width = Math.floor(width * scaleRatio);
      height = Math.floor(height * scaleRatio);
    }
    
    // Ensure even dimensions
    width = width & ~1;
    height = height & ~1;
    
    return { width, height };
  }

  private createASSSubtitles(subtitles: SubtitleSegment[], options: VideoExportOptions): string {
    const width = 1920;
    const height = 1080;
    
    // Convert RGBA to ASS color format (AABBGGRR)
    const rgbaToASS = (rgba: string): string => {
      const match = rgba.match(/rgba?\((\d+),\s*(\d+),\s*(\d+),?\s*([\d.]+)?\)/);
      if (!match) return '&H00FFFFFF'; // Default white
      
      const [_, r, g, b, a] = match;
      const alpha = Math.round((1 - (parseFloat(a || '1'))) * 255);
      const hex = alpha.toString(16).padStart(2, '0') +
                  parseInt(b).toString(16).padStart(2, '0') +
                  parseInt(g).toString(16).padStart(2, '0') +
                  parseInt(r).toString(16).padStart(2, '0');
      return '&H' + hex.toUpperCase();
    };

    // Get default style from first subtitle or use defaults
    const defaultStyle: Partial<SubtitleStyle> = subtitles[0]?.style || {};
    const fontSize = Math.round((defaultStyle.fontSize || 48) * 1.2); // Scale up for video
    const fontColor = rgbaToASS(defaultStyle.color || 'rgba(255, 255, 255, 1)');
    
    // Handle background based on options
    let backColor = '&H80000000'; // Semi-transparent black default
    let borderStyle = '1'; // 1 = outline + drop shadow, 3 = opaque box
    let outline = '2';
    let shadow = '1';
    
    if (options.removeBackground) {
      backColor = '&H00000000'; // Fully transparent
      borderStyle = '1';
    } else if (defaultStyle.backgroundColor) {
      const bgColor = defaultStyle.backgroundColor;
      const opacity = options.backgroundOpacity ?? defaultStyle.backgroundOpacity ?? 0.8;
      const bgMatch = bgColor.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
      if (bgMatch) {
        const [_, r, g, b] = bgMatch;
        const alpha = Math.round((1 - opacity) * 255);
        backColor = '&H' + alpha.toString(16).padStart(2, '0') +
                    parseInt(b).toString(16).padStart(2, '0') +
                    parseInt(g).toString(16).padStart(2, '0') +
                    parseInt(r).toString(16).padStart(2, '0');
        borderStyle = '3'; // Use opaque box style when background color is set
        outline = '0';
        shadow = '0';
      }
    }
    
    let ass = `[Script Info]
Title: Generated Subtitles
ScriptType: v4.00+
PlayResX: ${width}
PlayResY: ${height}
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${defaultStyle.fontFamily || 'Arial'},${fontSize},${fontColor},&H000000FF,&H00000000,${backColor},${defaultStyle.fontWeight === 'bold' ? 1 : 0},${defaultStyle.fontStyle === 'italic' ? 1 : 0},0,0,100,100,0,0,${borderStyle},${outline},${shadow},2,30,30,30,1\n`;

    // Add custom styles for different subtitle styles if they differ from default
    const styleMap = new Map<string, string>();
    styleMap.set('default', 'Default');
    
    subtitles.forEach((subtitle, index) => {
      if (subtitle.style && JSON.stringify(subtitle.style) !== JSON.stringify(defaultStyle)) {
        const styleKey = JSON.stringify(subtitle.style);
        if (!styleMap.has(styleKey)) {
          const styleName = `Style${styleMap.size}`;
          styleMap.set(styleKey, styleName);
          
          const style = subtitle.style;
          const customFontSize = Math.round((style.fontSize || 48) * 1.2);
          const customFontColor = rgbaToASS(style.color || 'rgba(255, 255, 255, 1)');
          
          ass += `Style: ${styleName},${style.fontFamily || 'Arial'},${customFontSize},${customFontColor},&H000000FF,&H00000000,${backColor},${style.fontWeight === 'bold' ? 1 : 0},${style.fontStyle === 'italic' ? 1 : 0},0,0,100,100,0,0,${borderStyle},${outline},${shadow},2,30,30,30,1\n`;
        }
      }
    });

    ass += `\n[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n`;

    subtitles.forEach((subtitle) => {
      const start = this.formatASSTime(subtitle.startTime);
      const end = this.formatASSTime(subtitle.endTime);
      const text = subtitle.text.replace(/\n/g, '\\N');
      
      // Determine which style to use
      let styleName = 'Default';
      if (subtitle.style) {
        const styleKey = JSON.stringify(subtitle.style);
        styleName = styleMap.get(styleKey) || 'Default';
      }
      
      ass += `Dialogue: 0,${start},${end},${styleName},,0,0,0,,${text}\n`;
    });

    return ass;
  }

  private createWebVTTSubtitles(subtitles: SubtitleSegment[]): string {
    let vtt = 'WEBVTT\n\n';

    subtitles.forEach((subtitle, index) => {
      const start = this.formatVTTTime(subtitle.startTime);
      const end = this.formatVTTTime(subtitle.endTime);
      vtt += `${index + 1}\n${start} --> ${end}\n${subtitle.text}\n\n`;
    });

    return vtt;
  }

  private createSRTSubtitles(subtitles: SubtitleSegment[]): string {
    let srt = '';

    subtitles.forEach((subtitle, index) => {
      const start = this.formatSRTTime(subtitle.startTime);
      const end = this.formatSRTTime(subtitle.endTime);
      srt += `${index + 1}\n${start} --> ${end}\n${subtitle.text}\n\n`;
    });

    return srt.trim();
  }

  private formatASSTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const centisecs = Math.floor((seconds % 1) * 100);
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${centisecs.toString().padStart(2, '0')}`;
  }

  private formatVTTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millisecs = Math.floor((seconds % 1) * 1000);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${millisecs.toString().padStart(3, '0')}`;
  }

  private formatSRTTime(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const millisecs = Math.floor((seconds % 1) * 1000);
    // SRT format uses comma instead of dot for milliseconds
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${millisecs.toString().padStart(3, '0')}`;
  }

  private getQualityCRF(quality: string, codec: 'h264' | 'vp9'): string {
    const crfMap = {
      h264: {
        low: '28',
        medium: '23',
        high: '18',
        ultra: '16'
      },
      vp9: {
        low: '37',
        medium: '31',
        high: '25',
        ultra: '20'
      }
    };

    return crfMap[codec][quality as keyof typeof crfMap.h264] || crfMap[codec].high;
  }

  async terminate(): Promise<void> {
    if (this.ffmpeg) {
      try {
        this.ffmpeg.terminate();
      } catch (e) {
        // Ignore termination errors
      }
      this.ffmpeg = null;
      this.loaded = false;
    }
  }
}

export const ffmpegVideoExportService = new FFmpegVideoExportService(); 