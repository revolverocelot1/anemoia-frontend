// ASCII Video Export Service
// Handles video export for ASCII animations using FFmpeg

import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface ASCIIFrameData {
  frameNumber: number;
  ascii: string;
  colors: Uint8ClampedArray | null;
  width: number;
  height: number;
  timestamp: number;
}

interface ExportOptions {
  frameRate: number;
  fontSize: number;
  fontFamily?: string;
  backgroundColor: string;
  format?: 'mp4' | 'webm';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

export class ASCIIVideoExportService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;

  async loadFFmpeg(): Promise<void> {
    if (this.loaded && this.ffmpeg) return;

    console.log('[ASCIIExport] Loading FFmpeg...');
    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    this.ffmpeg.on('progress', ({ progress }) => {
      console.log(`[FFmpeg] Progress: ${(progress * 100).toFixed(2)}%`);
    });

    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
      
      await this.ffmpeg.load({
        coreURL: `${baseURL}/ffmpeg-core.js`,
        wasmURL: `${baseURL}/ffmpeg-core.wasm`,
      });
      
      this.loaded = true;
      console.log('[ASCIIExport] FFmpeg loaded successfully');
      
    } catch (error) {
      console.error('[ASCIIExport] Failed to load FFmpeg:', error);
      throw new Error('Failed to load FFmpeg. Please check your internet connection.');
    }
  }

  async exportVideo(
    frames: ASCIIFrameData[],
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    options: ExportOptions,
    renderFrame: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, ascii: string, colors?: Uint8ClampedArray | null) => void,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      await this.loadFFmpeg();
    }

    const ffmpeg = this.ffmpeg!;
    
    try {
      console.log('[ASCIIExport] Starting video export...');
      
      // Set progress callback
      if (onProgress) {
        ffmpeg.on('progress', ({ progress }) => {
          onProgress(progress * 100);
        });
      }

      // Export frames as images
      const frameCount = frames.length;
      const padLength = frameCount.toString().length;
      
      for (let i = 0; i < frameCount; i++) {
        const frame = frames[i];
        renderFrame(canvas, ctx, frame.ascii, frame.colors);
        
        // Convert canvas to blob
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((blob) => resolve(blob!), 'image/png');
        });
        
        const data = await fetchFile(blob);
        const frameNumber = i.toString().padStart(padLength, '0');
        await ffmpeg.writeFile(`frame_${frameNumber}.png`, data);
        
        if (onProgress) {
          onProgress((i / frameCount) * 50); // First 50% for frame export
        }
      }

      // Determine output format
      const outputFormat = options.format || 'mp4';
      const outputFile = `output.${outputFormat}`;

      // Build FFmpeg command
      let ffmpegArgs: string[] = [
        '-framerate', options.frameRate.toString(),
        '-i', `frame_%0${padLength}d.png`,
        '-pix_fmt', 'yuv420p',
        '-threads', '0'
      ];

      // Add video codec and quality settings
      if (outputFormat === 'webm') {
        ffmpegArgs.push('-c:v', 'libvpx-vp9');
        ffmpegArgs.push('-crf', this.getQualityCRF(options.quality || 'high', 'vp9'));
        ffmpegArgs.push('-b:v', '2M');
      } else {
        ffmpegArgs.push('-c:v', 'libx264');
        ffmpegArgs.push('-crf', this.getQualityCRF(options.quality || 'high', 'h264'));
        ffmpegArgs.push('-preset', 'fast');
        ffmpegArgs.push('-profile:v', 'high');
        ffmpegArgs.push('-level', '4.2');
        ffmpegArgs.push('-movflags', '+faststart');
      }

      ffmpegArgs.push(outputFile);

      console.log('[ASCIIExport] Running FFmpeg command:', ffmpegArgs.join(' '));
      await ffmpeg.exec(ffmpegArgs);

      // Read output file
      const data = await ffmpeg.readFile(outputFile);
      const outputBlob = new Blob([data], { type: `video/${outputFormat}` });

      console.log('[ASCIIExport] Export completed successfully');

      return outputBlob;

    } catch (error) {
      console.error('[ASCIIExport] Export failed:', error);
      throw new Error(`Failed to export video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Clean up files
      try {
        const frameCount = frames.length;
        const padLength = frameCount.toString().length;
        
        for (let i = 0; i < frameCount; i++) {
          const frameNumber = i.toString().padStart(padLength, '0');
          await ffmpeg.deleteFile(`frame_${frameNumber}.png`);
        }
        await ffmpeg.deleteFile(`output.${options.format || 'mp4'}`);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
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

export const asciiVideoExportService = new ASCIIVideoExportService(); 