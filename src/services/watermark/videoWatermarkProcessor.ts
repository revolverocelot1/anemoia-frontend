/**
 * Gemini & Veo Video Watermark Removal Processor
 * High-performance browser-based video decoding, frame-by-frame reverse alpha blending,
 * and hardware-accelerated MP4 muxing with audio passthrough.
 */

import {
  Input,
  Output,
  BlobSource,
  BufferTarget,
  Mp4OutputFormat,
  CanvasSource,
  CanvasSink,
  EncodedAudioPacketSource,
  EncodedPacketSink,
  ALL_FORMATS,
  QUALITY_HIGH,
} from 'mediabunny';
import {
  removeWatermarkFromImageData,
  applyInverseAlphaPatch,
  getAlphaMapForSize,
  WatermarkDetectionResult,
} from './watermarkEngine';

export interface VideoProcessingProgress {
  phase: 'detecting' | 'processing' | 'muxing' | 'complete';
  progress: number; // 0 to 100
  currentFrame: number;
  totalFrames: number;
  fps: number;
  etaSeconds: number;
  statusText: string;
}

export interface ProcessedVideoResult {
  file: File;
  name: string;
  originalUrl: string;
  cleanedUrl: string;
  cleanedBlob: Blob;
  duration: number;
  width: number;
  height: number;
  fps: number;
  totalFrames: number;
  detected: boolean;
  detectionMeta: WatermarkDetectionResult;
  processingTimeMs: number;
}

/**
 * Checks if the browser supports hardware-accelerated WebCodecs.
 */
export function isWebCodecsSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'VideoDecoder' in window &&
    'VideoEncoder' in window
  );
}

/**
 * Process a Veo / Gemini video file locally, removing the watermark from every frame
 * with zero upload and hardware acceleration.
 */
export async function processVideoFile(
  file: File,
  onProgress?: (progress: VideoProcessingProgress) => void,
  abortSignal?: AbortSignal
): Promise<ProcessedVideoResult> {
  const startTime = performance.now();
  const originalUrl = URL.createObjectURL(file);

  onProgress?.({
    phase: 'detecting',
    progress: 2,
    currentFrame: 0,
    totalFrames: 0,
    fps: 0,
    etaSeconds: 0,
    statusText: 'Analyzing video metadata and locating watermark...',
  });

  // 1. Initialize input demuxer with ALL_FORMATS
  const inputSource = new BlobSource(file);
  const input = new Input({ source: inputSource, formats: ALL_FORMATS });

  const videoTrack = await input.getPrimaryVideoTrack();
  if (!videoTrack) {
    throw new Error('No video track found in the uploaded file');
  }

  const width = (await videoTrack.getCodedWidth().catch(() => 0)) || 1920;
  const height = (await videoTrack.getCodedHeight().catch(() => 0)) || 1080;
  const duration = (await input.computeDuration().catch(() => 10)) || 10;
  const frameRateMetrics = await videoTrack.computeFrameRateMetrics().catch(() => null);
  const frameRate = frameRateMetrics?.bestGuessFrameRate || 30;
  const estimatedFrames = Math.max(1, Math.round(duration * frameRate));

  // 2. Prepare offscreen canvas for frame processing
  const canvas =
    typeof OffscreenCanvas !== 'undefined'
      ? new OffscreenCanvas(width, height)
      : document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d', { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D;
  if (!ctx) {
    throw new Error('Failed to create canvas rendering context');
  }

  // 3. Prepare MP4 Output Muxer
  const target = new BufferTarget();
  const outputFormat = new Mp4OutputFormat({ fastStart: 'in-memory' });
  const output = new Output({ format: outputFormat, target });

  // Use standard H.264 AVC encoder with high quality
  const canvasSource = new CanvasSource(canvas as any, {
    codec: 'avc',
    quality: QUALITY_HIGH,
  });
  output.addVideoTrack(canvasSource, { frameRate });

  // 4. Check for audio track and setup passthrough if supported
  let audioPacketSource: EncodedAudioPacketSource | null = null;
  let audioSink: EncodedPacketSink | null = null;
  try {
    const audioTrack = await input.getPrimaryAudioTrack().catch(() => null);
    if (audioTrack) {
      const audioCodec = await audioTrack.getCodec().catch(() => null);
      if (audioCodec) {
        audioPacketSource = new EncodedAudioPacketSource(audioCodec);
        output.addAudioTrack(audioPacketSource);
        audioSink = new EncodedPacketSink(audioTrack);
      }
    }
  } catch (err) {
    console.warn('Audio passthrough setup note:', err);
  }

  await output.start();

  // 5. Canvas Sink for decoding video frames with hardware acceleration
  const videoSink = new CanvasSink(videoTrack, { width, height, fit: 'fill' } as any);

  let detectionMeta: WatermarkDetectionResult = { detected: false };
  let cachedAlphaMap: Float32Array | null = null;
  let frameCount = 0;
  let processingFps = 30;
  let lastProgressUpdate = performance.now();

  onProgress?.({
    phase: 'processing',
    progress: 5,
    currentFrame: 0,
    totalFrames: estimatedFrames,
    fps: 0,
    etaSeconds: Math.round(estimatedFrames / 30),
    statusText: 'Locating watermark and initializing high-speed pipeline...',
  });

  for await (const wrapped of videoSink.canvases()) {
    if (abortSignal?.aborted) {
      throw new Error('Video processing cancelled by user');
    }

    const timestamp = wrapped.timestamp;
    const sampleDuration = wrapped.duration || 1 / frameRate;

    // Draw the decoded frame onto our processing canvas
    ctx.drawImage(wrapped.canvas as any, 0, 0, width, height);

    // On frame 0, detect watermark position and lock ROI
    if (frameCount === 0) {
      const frameData = ctx.getImageData(0, 0, width, height);
      detectionMeta = removeWatermarkFromImageData(frameData);
      if (detectionMeta.detected) {
        if (detectionMeta.cleanedImageData) {
          ctx.putImageData(detectionMeta.cleanedImageData, 0, 0);
        } else {
          ctx.putImageData(frameData, 0, 0);
        }
        const size = detectionMeta.size || 96;
        cachedAlphaMap = await getAlphaMapForSize(size);
      }
    } else if (detectionMeta.detected) {
      // Fast single-pass mathematical reverse-alpha on subsequent frames (<0.2ms per frame)
      const pos = detectionMeta.position;
      if (cachedAlphaMap && pos && pos.width > 0 && pos.height > 0) {
        const patch = ctx.getImageData(pos.x, pos.y, pos.width, pos.height);
        applyInverseAlphaPatch(patch, cachedAlphaMap, detectionMeta.alphaGain || 1.0);
        ctx.putImageData(patch, pos.x, pos.y);
      } else {
        const frameData = ctx.getImageData(0, 0, width, height);
        removeWatermarkFromImageData(frameData);
        if (detectionMeta.cleanedImageData) {
          ctx.putImageData(detectionMeta.cleanedImageData, 0, 0);
        } else {
          ctx.putImageData(frameData, 0, 0);
        }
      }
    }

    // Add processed frame to encoder
    await canvasSource.add(timestamp, sampleDuration);
    frameCount++;

    // Calculate progress and ETA
    const now = performance.now();
    if (now - lastProgressUpdate > 150 || frameCount === estimatedFrames) {
      lastProgressUpdate = now;
      const elapsedSec = (now - startTime) / 1000;
      processingFps = frameCount / Math.max(0.1, elapsedSec);
      const remainingFrames = Math.max(0, estimatedFrames - frameCount);
      const etaSeconds = Math.round(remainingFrames / Math.max(1, processingFps));
      const pct = Math.min(95, Math.round((frameCount / estimatedFrames) * 90) + 5);

      onProgress?.({
        phase: 'processing',
        progress: pct,
        currentFrame: frameCount,
        totalFrames: estimatedFrames,
        fps: Math.round(processingFps),
        etaSeconds,
        statusText: `Processed ${frameCount} of ${estimatedFrames} frames (${Math.round(processingFps)} FPS)`,
      });
    }
  }

  canvasSource.close();

  // 6. Copy audio packets if present
  if (audioSink && audioPacketSource) {
    try {
      for await (const packet of audioSink.packets()) {
        await audioPacketSource.add(packet);
      }
    } catch (audioErr) {
      console.warn('Audio packets iteration ended:', audioErr);
    } finally {
      try {
        audioPacketSource.close();
      } catch (_) {}
    }
  }

  // 7. Finalize Video Output
  onProgress?.({
    phase: 'muxing',
    progress: 96,
    currentFrame: frameCount,
    totalFrames: frameCount,
    fps: Math.round(processingFps),
    etaSeconds: 1,
    statusText: 'Finalizing MP4 container and muxing audio...',
  });

  await output.finalize();

  const buffer = target.buffer;
  if (!buffer) {
    throw new Error('Failed to retrieve video buffer from target');
  }

  const cleanedBlob = new Blob([buffer], { type: 'video/mp4' });
  const cleanedUrl = URL.createObjectURL(cleanedBlob);
  const processingTimeMs = Math.round(performance.now() - startTime);

  onProgress?.({
    phase: 'complete',
    progress: 100,
    currentFrame: frameCount,
    totalFrames: frameCount,
    fps: Math.round(processingFps),
    etaSeconds: 0,
    statusText: `Complete! Cleaned ${frameCount} frames in ${(processingTimeMs / 1000).toFixed(1)}s`,
  });

  return {
    file,
    name: file.name,
    originalUrl,
    cleanedUrl,
    cleanedBlob,
    duration,
    width,
    height,
    fps: frameRate,
    totalFrames: frameCount,
    detected: detectionMeta.detected,
    detectionMeta,
    processingTimeMs,
  };
}
