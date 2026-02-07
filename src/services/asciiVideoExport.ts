// ASCII Video Export Service
// Handles video export for ASCII animations using FFmpeg WASM
// Supports MP4 output with original audio muxing

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
  format?: 'mp4';
  quality?: 'low' | 'medium' | 'high' | 'ultra';
}

export class ASCIIVideoExportService {
  private ffmpeg: FFmpeg | null = null;
  private loaded = false;
  private loading = false;

  async loadFFmpeg(): Promise<void> {
    if (this.loaded && this.ffmpeg) return;
    if (this.loading) {
      // Wait for existing load to complete
      while (this.loading) {
        await new Promise(r => setTimeout(r, 100));
      }
      return;
    }

    this.loading = true;
    console.log('[ASCIIExport] Loading FFmpeg WASM...');
    this.ffmpeg = new FFmpeg();

    this.ffmpeg.on('log', ({ message }) => {
      console.log('[FFmpeg]', message);
    });

    try {
      // Use UMD build - more compatible, doesn't require SharedArrayBuffer
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
      
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      this.loaded = true;
      console.log('[ASCIIExport] FFmpeg loaded successfully');
      
    } catch (error) {
      console.error('[ASCIIExport] Failed to load FFmpeg:', error);
      this.ffmpeg = null;
      throw new Error('Failed to load FFmpeg. Please check your internet connection.');
    } finally {
      this.loading = false;
    }
  }

  async exportVideo(
    frames: ASCIIFrameData[],
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    options: ExportOptions,
    renderFrame: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, ascii: string, colors?: Uint8ClampedArray | null) => void,
    onProgress?: (progress: number) => void,
    originalFile?: File | null
  ): Promise<Blob> {
    if (!this.ffmpeg || !this.loaded) {
      await this.loadFFmpeg();
    }

    const ffmpeg = this.ffmpeg!;
    
    try {
      console.log('[ASCIIExport] Starting MP4 export...');
      
      // Set progress callback
      if (onProgress) {
        ffmpeg.on('progress', ({ progress }) => {
          // Progress for the encoding phase (second half)
          onProgress(50 + progress * 50);
        });
      }

      // Render and write frames as PNGs
      const frameCount = frames.length;
      const padLength = Math.max(4, frameCount.toString().length);
      
      for (let i = 0; i < frameCount; i++) {
        const frame = frames[i];
        renderFrame(canvas, ctx, frame.ascii, frame.colors);
        
        // Convert canvas to blob then to Uint8Array
        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png');
        });
        
        const data = await fetchFile(blob);
        const frameNumber = i.toString().padStart(padLength, '0');
        await ffmpeg.writeFile(`frame_${frameNumber}.png`, data);
        
        if (onProgress) {
          onProgress((i / frameCount) * 50); // First 50% for frame rendering
        }
      }

      // Write original video for audio extraction if available
      let hasAudio = false;
      if (originalFile) {
        try {
          const originalData = await fetchFile(originalFile);
          await ffmpeg.writeFile('original_input.mp4', originalData);
          hasAudio = true;
          console.log('[ASCIIExport] Original video written for audio extraction');
        } catch (e) {
          console.warn('[ASCIIExport] Could not write original file for audio:', e);
        }
      }

      const outputFile = 'output.mp4';

      // Build FFmpeg command - MP4 with H.264
      let ffmpegArgs: string[];

      if (hasAudio) {
        // Mux ASCII video frames with audio from original
        ffmpegArgs = [
          '-framerate', options.frameRate.toString(),
          '-i', `frame_%0${padLength}d.png`,
          '-i', 'original_input.mp4',
          '-map', '0:v',       // Video from ASCII frames
          '-map', '1:a?',      // Audio from original (? = optional, won't fail if no audio)
          '-c:v', 'libx264',
          '-crf', this.getQualityCRF(options.quality || 'high'),
          '-preset', 'fast',
          '-pix_fmt', 'yuv420p',
          '-c:a', 'aac',
          '-b:a', '128k',
          '-shortest',         // Match duration to shortest stream
          '-movflags', '+faststart',
          outputFile
        ];
      } else {
        // Video only (no audio source)
        ffmpegArgs = [
          '-framerate', options.frameRate.toString(),
          '-i', `frame_%0${padLength}d.png`,
          '-c:v', 'libx264',
          '-crf', this.getQualityCRF(options.quality || 'high'),
          '-preset', 'fast',
          '-pix_fmt', 'yuv420p',
          '-movflags', '+faststart',
          outputFile
        ];
      }

      console.log('[ASCIIExport] FFmpeg command:', ffmpegArgs.join(' '));
      await ffmpeg.exec(ffmpegArgs);

      // Read output
      const data = await ffmpeg.readFile(outputFile);
      const outputBlob = new Blob([data], { type: 'video/mp4' });

      console.log(`[ASCIIExport] Export done: ${(outputBlob.size / 1024 / 1024).toFixed(2)} MB`);
      return outputBlob;

    } catch (error) {
      console.error('[ASCIIExport] Export failed:', error);
      throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      // Cleanup temp files
      try {
        const frameCount = frames.length;
        const padLength = Math.max(4, frameCount.toString().length);
        for (let i = 0; i < frameCount; i++) {
          const num = i.toString().padStart(padLength, '0');
          try { await ffmpeg.deleteFile(`frame_${num}.png`); } catch {}
        }
        try { await ffmpeg.deleteFile('output.mp4'); } catch {}
        try { await ffmpeg.deleteFile('original_input.mp4'); } catch {}
      } catch {}
    }
  }

  private getQualityCRF(quality: string): string {
    const map: Record<string, string> = { low: '28', medium: '23', high: '18', ultra: '16' };
    return map[quality] || '18';
  }

  async terminate(): Promise<void> {
    if (this.ffmpeg) {
      try { this.ffmpeg.terminate(); } catch {}
      this.ffmpeg = null;
      this.loaded = false;
    }
  }
}

export const asciiVideoExportService = new ASCIIVideoExportService();
