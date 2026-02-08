// ASCII Video Export Service
// Primary: WebCodecs API + mp4-muxer for native H.264 encoding (fast, reliable)
// Fallback: FFmpeg WASM (for audio muxing or full encode when WebCodecs unavailable)

import { Muxer, ArrayBufferTarget } from 'mp4-muxer';
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
  private ffmpegLoaded = false;
  private ffmpegLoading = false;

  /**
   * Export ASCII frames to MP4 video.
   * Strategy:
   *   1. Encode video with WebCodecs + mp4-muxer (native H.264, fast)
   *   2. If original file has audio, mux it in via FFmpeg WASM (copy video, encode audio)
   *   3. If WebCodecs unavailable, fall back to full FFmpeg WASM encode
   */
  async exportVideo(
    frames: ASCIIFrameData[],
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    options: ExportOptions,
    renderFrame: (canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, ascii: string, colors?: Uint8ClampedArray | null) => void,
    onProgress?: (progress: number) => void,
    originalFile?: File | null
  ): Promise<Blob> {
    console.log('[ASCIIExport] Starting MP4 export...');
    console.log(`[ASCIIExport] ${frames.length} frames @ ${options.frameRate}fps, canvas ${canvas.width}x${canvas.height}`);

    // Ensure dimensions are even (H.264 requirement)
    canvas.width = Math.ceil(canvas.width / 2) * 2;
    canvas.height = Math.ceil(canvas.height / 2) * 2;

    // ── Primary: WebCodecs + mp4-muxer ──
    if (typeof VideoEncoder !== 'undefined') {
      try {
        const videoBlob = await this.encodeWithWebCodecs(
          frames, canvas, ctx, options, renderFrame, onProgress
        );

        if (videoBlob.size === 0) {
          throw new Error('Encoded video is empty');
        }

        // Mux audio from original if available
        if (originalFile) {
          try {
            console.log('[ASCIIExport] Muxing audio from original...');
            const finalBlob = await this.muxAudioWithFFmpeg(videoBlob, originalFile, onProgress);
            if (finalBlob.size > 0) return finalBlob;
          } catch (audioErr) {
            console.warn('[ASCIIExport] Audio muxing failed, returning video-only MP4:', audioErr);
          }
        }

        return videoBlob;
      } catch (webCodecsErr) {
        console.warn('[ASCIIExport] WebCodecs encode failed, trying FFmpeg:', webCodecsErr);
      }
    }

    // ── Fallback: Full FFmpeg WASM ──
    return this.encodeWithFFmpeg(frames, canvas, ctx, options, renderFrame, onProgress, originalFile);
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // WebCodecs + mp4-muxer (primary path)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private async encodeWithWebCodecs(
    frames: ASCIIFrameData[],
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    options: ExportOptions,
    renderFrame: Function,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log('[ASCIIExport] Encoding with WebCodecs + mp4-muxer');

    const width = canvas.width;
    const height = canvas.height;
    const fps = options.frameRate;
    const frameDurationUs = Math.round(1_000_000 / fps);

    // Find a supported H.264 codec
    const codecs = ['avc1.42001f', 'avc1.4d001f', 'avc1.640028', 'avc1.420034'];
    let chosenCodec = '';

    for (const codec of codecs) {
      try {
        const support = await VideoEncoder.isConfigSupported({
          codec,
          width,
          height,
          bitrate: this.getBitrate(options.quality || 'high'),
          framerate: fps,
        });
        if (support.supported) {
          chosenCodec = codec;
          break;
        }
      } catch { /* try next */ }
    }

    if (!chosenCodec) {
      throw new Error('No H.264 codec supported by this browser');
    }

    console.log(`[ASCIIExport] Using codec: ${chosenCodec}`);

    const target = new ArrayBufferTarget();
    const muxer = new Muxer({
      target,
      video: {
        codec: 'avc',
        width,
        height,
      },
      fastStart: 'in-memory',
    });

    let encodeError: Error | null = null;

    const encoder = new VideoEncoder({
      output: (chunk, meta) => {
        muxer.addVideoChunk(chunk, meta);
      },
      error: (e) => {
        console.error('[ASCIIExport] VideoEncoder error:', e);
        encodeError = e instanceof Error ? e : new Error(String(e));
      },
    });

    encoder.configure({
      codec: chosenCodec,
      width,
      height,
      bitrate: this.getBitrate(options.quality || 'high'),
      framerate: fps,
    });

    // Encode each frame
    for (let i = 0; i < frames.length; i++) {
      if (encodeError) throw encodeError;

      const frame = frames[i];
      renderFrame(canvas, ctx, frame.ascii, frame.colors);

      const videoFrame = new VideoFrame(canvas, {
        timestamp: i * frameDurationUs,
        duration: frameDurationUs,
      });

      const keyFrame = i % Math.max(1, fps * 2) === 0 || i === 0;
      encoder.encode(videoFrame, { keyFrame });
      videoFrame.close();

      // Pace encoding — don't overflow the encoder queue
      if (encoder.encodeQueueSize > 8) {
        await new Promise<void>(resolve => {
          const check = () => {
            if (encoder.encodeQueueSize <= 3) resolve();
            else setTimeout(check, 5);
          };
          check();
        });
      }

      if (onProgress) {
        onProgress(Math.round((i / frames.length) * 85));
      }
    }

    await encoder.flush();
    encoder.close();

    if (encodeError) throw encodeError;

    muxer.finalize();

    if (onProgress) onProgress(90);

    const { buffer } = target;
    const blob = new Blob([buffer], { type: 'video/mp4' });
    console.log(`[ASCIIExport] WebCodecs export done: ${(blob.size / 1024 / 1024).toFixed(2)} MB, ` +
      `duration ≈ ${(frames.length / fps).toFixed(2)}s`);

    if (onProgress) onProgress(95);
    return blob;
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FFmpeg: mux audio from original into video-only MP4
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private async muxAudioWithFFmpeg(
    videoBlob: Blob,
    originalFile: File,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    await this.loadFFmpeg();
    const ffmpeg = this.ffmpeg!;

    try {
      const videoData = await fetchFile(videoBlob);
      await ffmpeg.writeFile('video_only.mp4', videoData);

      const originalData = await fetchFile(originalFile);
      await ffmpeg.writeFile('original.mp4', originalData);

      // Copy video stream, encode audio from original
      await ffmpeg.exec([
        '-i', 'video_only.mp4',
        '-i', 'original.mp4',
        '-map', '0:v',        // Video from our encoded MP4
        '-map', '1:a?',       // Audio from original (? = optional)
        '-c:v', 'copy',       // Copy video — no re-encoding!
        '-c:a', 'aac',
        '-b:a', '128k',
        '-shortest',          // Match to shortest stream
        '-movflags', '+faststart',
        'output_final.mp4'
      ]);

      const data = await ffmpeg.readFile('output_final.mp4');
      const finalBlob = new Blob([data as BlobPart], { type: 'video/mp4' });

      console.log(`[ASCIIExport] Audio muxed successfully: ${(finalBlob.size / 1024 / 1024).toFixed(2)} MB`);

      // Cleanup
      try {
        await ffmpeg.deleteFile('video_only.mp4');
        await ffmpeg.deleteFile('original.mp4');
        await ffmpeg.deleteFile('output_final.mp4');
      } catch { /* ignore cleanup errors */ }

      if (onProgress) onProgress(100);
      return finalBlob;

    } catch (error) {
      try {
        await ffmpeg.deleteFile('video_only.mp4');
        await ffmpeg.deleteFile('original.mp4');
        await ffmpeg.deleteFile('output_final.mp4');
      } catch { /* ignore */ }
      throw error;
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FFmpeg WASM: full encode fallback
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private async encodeWithFFmpeg(
    frames: ASCIIFrameData[],
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D,
    options: ExportOptions,
    renderFrame: Function,
    onProgress?: (progress: number) => void,
    originalFile?: File | null
  ): Promise<Blob> {
    console.log('[ASCIIExport] Full FFmpeg WASM encode');
    await this.loadFFmpeg();
    const ffmpeg = this.ffmpeg!;

    if (onProgress) {
      ffmpeg.on('progress', ({ progress }) => {
        onProgress(50 + progress * 50);
      });
    }

    const frameCount = frames.length;
    const padLength = Math.max(4, frameCount.toString().length);

    try {
      // Write frames as PNGs
      for (let i = 0; i < frameCount; i++) {
        const frame = frames[i];
        renderFrame(canvas, ctx, frame.ascii, frame.colors);

        const blob = await new Promise<Blob>((resolve) => {
          canvas.toBlob((b) => resolve(b!), 'image/png');
        });

        const data = await fetchFile(blob);
        const num = i.toString().padStart(padLength, '0');
        await ffmpeg.writeFile(`frame_${num}.png`, data);

        if (onProgress) onProgress(Math.round((i / frameCount) * 50));
      }

      // Write original for audio extraction
      let hasAudio = false;
      if (originalFile) {
        try {
          const origData = await fetchFile(originalFile);
          await ffmpeg.writeFile('original_input.mp4', origData);
          hasAudio = true;
        } catch (e) {
          console.warn('[ASCIIExport] Could not write original for audio:', e);
        }
      }

      const outputFile = 'output.mp4';

      const ffmpegArgs = hasAudio ? [
        '-framerate', options.frameRate.toString(),
        '-i', `frame_%0${padLength}d.png`,
        '-i', 'original_input.mp4',
        '-map', '0:v', '-map', '1:a?',
        '-c:v', 'libx264',
        '-crf', this.getQualityCRF(options.quality || 'high'),
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        '-c:a', 'aac', '-b:a', '128k',
        '-shortest',
        '-movflags', '+faststart',
        outputFile
      ] : [
        '-framerate', options.frameRate.toString(),
        '-i', `frame_%0${padLength}d.png`,
        '-c:v', 'libx264',
        '-crf', this.getQualityCRF(options.quality || 'high'),
        '-preset', 'fast',
        '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart',
        outputFile
      ];

      console.log('[ASCIIExport] FFmpeg command:', ffmpegArgs.join(' '));
      await ffmpeg.exec(ffmpegArgs);

      const data = await ffmpeg.readFile(outputFile);
      const outputBlob = new Blob([data as BlobPart], { type: 'video/mp4' });

      console.log(`[ASCIIExport] FFmpeg export done: ${(outputBlob.size / 1024 / 1024).toFixed(2)} MB`);
      return outputBlob;

    } finally {
      // Cleanup temp files
      try {
        for (let i = 0; i < frameCount; i++) {
          const num = i.toString().padStart(padLength, '0');
          try { await ffmpeg.deleteFile(`frame_${num}.png`); } catch { /* ignore */ }
        }
        try { await ffmpeg.deleteFile('output.mp4'); } catch { /* ignore */ }
        try { await ffmpeg.deleteFile('original_input.mp4'); } catch { /* ignore */ }
      } catch { /* ignore */ }
    }
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // FFmpeg loader with CDN fallback
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  private async loadFFmpeg(): Promise<void> {
    if (this.ffmpegLoaded && this.ffmpeg) return;
    if (this.ffmpegLoading) {
      while (this.ffmpegLoading) await new Promise(r => setTimeout(r, 100));
      if (this.ffmpegLoaded) return;
      throw new Error('FFmpeg loading failed in another context');
    }

    this.ffmpegLoading = true;
    this.ffmpeg = new FFmpeg();
    this.ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message));

    try {
      // Try multiple CDNs for resilience
      const cdns = [
        'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd',
        'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
      ];

      let loaded = false;
      for (const baseURL of cdns) {
        try {
          console.log(`[ASCIIExport] Trying CDN: ${baseURL}`);
          await this.ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          });
          loaded = true;
          console.log(`[ASCIIExport] FFmpeg loaded from ${baseURL}`);
          break;
        } catch (e) {
          console.warn(`[ASCIIExport] CDN failed (${baseURL}):`, e);
        }
      }

      if (!loaded) throw new Error('FFmpeg could not be loaded from any CDN');
      this.ffmpegLoaded = true;

    } catch (error) {
      console.error('[ASCIIExport] FFmpeg loading failed:', error);
      this.ffmpeg = null;
      throw new Error(`FFmpeg loading failed: ${error instanceof Error ? error.message : 'Unknown'}`);
    } finally {
      this.ffmpegLoading = false;
    }
  }

  // ── Helpers ──
  private getBitrate(quality: string): number {
    const map: Record<string, number> = {
      low: 1_500_000,
      medium: 3_000_000,
      high: 5_000_000,
      ultra: 10_000_000,
    };
    return map[quality] || 5_000_000;
  }

  private getQualityCRF(quality: string): string {
    const map: Record<string, string> = { low: '28', medium: '23', high: '18', ultra: '16' };
    return map[quality] || '18';
  }

  async terminate(): Promise<void> {
    if (this.ffmpeg) {
      try { this.ffmpeg.terminate(); } catch { /* ignore */ }
      this.ffmpeg = null;
      this.ffmpegLoaded = false;
    }
  }
}

export const asciiVideoExportService = new ASCIIVideoExportService();
