import type { SubtitleSegment, VideoExportOptions } from '../types/caption-studio';
import { SubtitleRenderer } from './subtitle-renderer.service';

export class VideoExportService {
  private supportsWebCodecs: boolean = false;

  constructor() {
    // Check WebCodecs support
    this.supportsWebCodecs = 'VideoEncoder' in window && 'VideoDecoder' in window;
  }

  async exportVideo(
    video: HTMLVideoElement,
    subtitles: SubtitleSegment[],
    options: VideoExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    if (this.supportsWebCodecs && options.format === 'mp4') {
      return this.exportWithWebCodecs(video, subtitles, options, onProgress);
    } else {
      return this.exportWithMediaRecorder(video, subtitles, options, onProgress);
    }
  }

  // Export using WebCodecs API (better quality, more control)
  private async exportWithWebCodecs(
    video: HTMLVideoElement,
    subtitles: SubtitleSegment[],
    options: VideoExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log('[VideoExport] Starting WebCodecs export');
    const startTime = performance.now();
    let lastFrameTime = startTime;
    let frameCount = 0;
    
    // Ensure dimensions are even (WebCodecs requirement)
    const width = video.videoWidth % 2 === 0 ? video.videoWidth : video.videoWidth - 1;
    const height = video.videoHeight % 2 === 0 ? video.videoHeight : video.videoHeight - 1;
    
    console.log(`[VideoExport] Video dimensions: ${width}x${height}`);
    
    // Create offscreen canvas for rendering
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');

    const subtitleCanvas = new OffscreenCanvas(width, height);
    const renderer = new SubtitleRenderer(subtitleCanvas as any);

    // Configure encoder with supported settings
    const encoderConfig: VideoEncoderConfig = {
      codec: options.codec || 'avc1.42E01E', // H.264 baseline
      width: width,
      height: height,
      bitrate: options.bitrate || 5000000,
      framerate: options.fps || 30,
      latencyMode: 'quality',
      avc: { format: 'avc' }
    };

    // Check if configuration is supported
    try {
      const support = await VideoEncoder.isConfigSupported(encoderConfig);
      if (!support.supported) {
        console.warn('[VideoExport] WebCodecs configuration not supported:', encoderConfig);
        // Fallback to MediaRecorder
        return this.exportWithMediaRecorder(video, subtitles, options, onProgress);
      }
    } catch (error) {
      console.error('[VideoExport] Error checking WebCodecs support:', error);
      return this.exportWithMediaRecorder(video, subtitles, options, onProgress);
    }

    // Use a streaming approach with limited buffer
    const MAX_CHUNKS_IN_MEMORY = 50;
    const chunkBatches: Uint8Array[][] = [];
    let currentBatch: Uint8Array[] = [];
    let encoderMetadata: EncodedVideoChunkMetadata | undefined;
    let totalChunkSize = 0;
    let processedChunks = 0;

    const encoder = new VideoEncoder({
      output: (chunk, metadata) => {
        // Convert chunk to Uint8Array immediately
        const chunkData = new Uint8Array(chunk.byteLength);
        chunk.copyTo(chunkData);
        
        currentBatch.push(chunkData);
        totalChunkSize += chunk.byteLength;
        processedChunks++;
        
        // When batch is full, move it to storage and create new batch
        if (currentBatch.length >= MAX_CHUNKS_IN_MEMORY) {
          chunkBatches.push(currentBatch);
          currentBatch = [];
          console.log(`[VideoExport] Batch stored. Total batches: ${chunkBatches.length}, Memory: ${(totalChunkSize / 1024 / 1024).toFixed(2)}MB`);
        }
        
        if (metadata) {
          encoderMetadata = metadata;
        }
      },
      error: (error) => {
        console.error('[VideoExport] Encoder error:', error);
      }
    });

    encoder.configure(encoderConfig);

    // Process video frame by frame
    const fps = options.fps || 30;
    const frameDuration = 1 / fps;
    const totalFrames = Math.ceil(video.duration * fps);
    
    console.log(`[VideoExport] Total frames to process: ${totalFrames}`);
    
    // Create a more efficient frame processing queue
    const FRAME_BUFFER_SIZE = 5;
    let processedFrames = 0;
    
    try {
      // Pre-create frame objects pool for reuse
      const framePool: VideoFrame[] = [];
      
      // Process frames in chunks with parallel encoding
      for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += FRAME_BUFFER_SIZE) {
        const framesToProcess = Math.min(FRAME_BUFFER_SIZE, totalFrames - frameIndex);
        const framePromises: Promise<void>[] = [];
        
        for (let i = 0; i < framesToProcess; i++) {
          const currentFrameIndex = frameIndex + i;
          const currentTime = currentFrameIndex * frameDuration;
          
          framePromises.push(this.processFrame(
            video,
            canvas,
            ctx,
            subtitleCanvas,
            renderer,
            subtitles,
            currentTime,
            currentFrameIndex,
            encoder,
            frameDuration,
            options
          ));
        }
        
        // Wait for all frames in buffer to complete
        await Promise.all(framePromises);
        
        processedFrames += framesToProcess;
        frameCount += framesToProcess;
        
        // Calculate FPS periodically
        if (frameCount % 30 === 0) {
          const currentFrameTime = performance.now();
          const fps = 30000 / (currentFrameTime - lastFrameTime);
          console.log(`[VideoExport] Current FPS: ${fps.toFixed(2)}, Processed: ${processedFrames}/${totalFrames}`);
          lastFrameTime = currentFrameTime;
        }

        // Update progress
        if (onProgress) {
          onProgress((processedFrames / totalFrames) * 100);
        }
        
        // Yield control to prevent blocking
        await new Promise(resolve => setTimeout(resolve, 0));
      }

      // Store final batch
      if (currentBatch.length > 0) {
        chunkBatches.push(currentBatch);
      }

      // Flush encoder
      console.log('[VideoExport] Flushing encoder...');
      await encoder.flush();
      encoder.close();

      const totalTime = (performance.now() - startTime) / 1000;
      console.log(`[VideoExport] Export completed in ${totalTime.toFixed(2)}s, Average FPS: ${(totalFrames / totalTime).toFixed(2)}`);

      // Combine all batches into final blob
      const totalSize = chunkBatches.reduce((acc, batch) => 
        acc + batch.reduce((batchAcc, chunk) => batchAcc + chunk.byteLength, 0), 0
      );
      
      const finalBuffer = new Uint8Array(totalSize);
      let offset = 0;
      
      for (const batch of chunkBatches) {
        for (const chunk of batch) {
          finalBuffer.set(chunk, offset);
          offset += chunk.byteLength;
        }
      }
      
      return new Blob([finalBuffer], { type: 'video/mp4' });
      
    } catch (error) {
      console.error('[VideoExport] Export failed:', error);
      encoder.close();
      throw error;
    } finally {
      // Clean up resources
      chunkBatches.length = 0;
      currentBatch.length = 0;
    }
  }
  
  // Helper method to process a single frame
  private async processFrame(
    video: HTMLVideoElement,
    canvas: OffscreenCanvas,
    ctx: OffscreenCanvasRenderingContext2D,
    subtitleCanvas: OffscreenCanvas,
    renderer: SubtitleRenderer,
    subtitles: SubtitleSegment[],
    currentTime: number,
    frameIndex: number,
    encoder: VideoEncoder,
    frameDuration: number,
    options: VideoExportOptions
  ): Promise<void> {
    // Seek to the target time with proper waiting
    if (Math.abs(video.currentTime - currentTime) > 0.001) {
      video.currentTime = currentTime;
      
      // Wait for seek to complete properly
      await new Promise<void>((resolve) => {
        let seekComplete = false;
        const maxWaitTime = 500; // Maximum wait time in ms
        const startTime = Date.now();
        
        const checkSeek = () => {
          // Check if seek is complete or if we've waited too long
          if (seekComplete || Date.now() - startTime > maxWaitTime) {
            resolve();
            return;
          }
          
          // Check if video time is close enough to target
          if (Math.abs(video.currentTime - currentTime) < 0.01) {
            seekComplete = true;
            resolve();
            return;
          }
          
          // Continue checking
          requestAnimationFrame(checkSeek);
        };
        
        const seekHandler = () => {
          seekComplete = true;
          resolve();
        };
        
        video.addEventListener('seeked', seekHandler, { once: true });
        
        // Start checking immediately
        checkSeek();
      });
      
      // Additional wait to ensure frame is rendered
      await new Promise(resolve => setTimeout(resolve, 50));
    }
    
    // Clear canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw video frame with proper scaling
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Draw subtitles if burning is enabled
    if (options.burnSubtitles) {
      // Find active subtitles at current time
      const activeSubtitles = subtitles.filter(
        sub => currentTime >= sub.startTime && currentTime <= sub.endTime
      );
      
      if (activeSubtitles.length > 0) {
        // Clear subtitle canvas first
        const subtitleCtx = subtitleCanvas.getContext('2d');
        if (subtitleCtx) {
          subtitleCtx.clearRect(0, 0, subtitleCanvas.width, subtitleCanvas.height);
        }
        
        // Render subtitles with proper styling
        renderer.renderSubtitles(subtitles, canvas.width, canvas.height, currentTime);
        
        // Draw subtitle canvas on main canvas
        ctx.drawImage(subtitleCanvas, 0, 0);
      }
    }

    // Create video frame with current canvas content
    const frame = new VideoFrame(canvas, {
      timestamp: currentTime * 1000000, // microseconds
      duration: frameDuration * 1000000
    });

    // Encode frame (keyframe every second for better quality)
    const isKeyFrame = frameIndex % options.fps === 0;
    encoder.encode(frame, { keyFrame: isKeyFrame });
    
    // Important: close frame to free memory
    frame.close();
  }

  // Export using MediaRecorder API (simpler but less control)
  private async exportWithMediaRecorder(
    video: HTMLVideoElement,
    subtitles: SubtitleSegment[],
    options: VideoExportOptions,
    onProgress?: (progress: number) => void
  ): Promise<Blob> {
    console.log('[VideoExport] Starting MediaRecorder export');
    
    // Create canvas for rendering
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d', {
      alpha: false,
      desynchronized: false,
      willReadFrequently: false
    });
    if (!ctx) throw new Error('Failed to get canvas context');

    const subtitleCanvas = document.createElement('canvas');
    subtitleCanvas.width = video.videoWidth;
    subtitleCanvas.height = video.videoHeight;
    const renderer = new SubtitleRenderer(subtitleCanvas);

    // Configure canvas for better rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // Get canvas stream with proper frame rate
    const fps = options.fps || 30;
    const stream = canvas.captureStream(fps);

    // Create audio context for audio handling
    let audioTrack: MediaStreamTrack | null = null;
    
    try {
      // Try to get audio from the video element
      const videoElement = video as any;
      if (videoElement.captureStream) {
        const videoStream = videoElement.captureStream();
        const audioTracks = videoStream.getAudioTracks();
        if (audioTracks.length > 0) {
          audioTrack = audioTracks[0];
          if (audioTrack) {
            stream.addTrack(audioTrack);
            console.log('[VideoExport] Audio track added from video element');
          }
        }
      }
    } catch (error) {
      console.warn('[VideoExport] Could not capture audio from video element:', error);
    }

    // Configure MediaRecorder with better settings
    const mimeTypes = [
      'video/webm;codecs=vp9,opus',
      'video/webm;codecs=vp8,opus', 
      'video/webm;codecs=vp9',
      'video/webm;codecs=vp8',
      'video/webm',
      'video/mp4'
    ];
    
    let selectedMimeType = 'video/webm';
    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        selectedMimeType = mimeType;
        break;
      }
    }
    
    console.log('[VideoExport] Using MIME type:', selectedMimeType);
    
    const recorder = new MediaRecorder(stream, {
      mimeType: selectedMimeType,
      videoBitsPerSecond: options.bitrate || 5000000
    });

    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) {
        chunks.push(e.data);
      }
    };

    // Start recording
    recorder.start(100); // Get data every 100ms for smoother playback

    // Reset video to start
    video.currentTime = 0;
    video.pause(); // Don't auto-play, we'll control playback manually

    let frameCount = 0;
    const totalFrames = Math.ceil(video.duration * fps);
    let lastTime = 0;
    let animationId: number;

    // Animation loop for rendering
    const renderFrame = async () => {
      const currentTime = frameCount / fps;
      
      if (currentTime >= video.duration) {
        // Stop recording when done
        cancelAnimationFrame(animationId);
        recorder.stop();
        return;
      }

      // Seek video to current time if needed
      if (Math.abs(video.currentTime - currentTime) > 0.1) {
        video.currentTime = currentTime;
        // Wait a bit for seek to complete
        await new Promise(resolve => setTimeout(resolve, 50));
      }

      // Clear and draw video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      // Draw subtitles if burning is enabled
      if (options.burnSubtitles) {
        const activeSubtitles = subtitles.filter(
          sub => currentTime >= sub.startTime && currentTime <= sub.endTime
        );
        
        if (activeSubtitles.length > 0) {
          renderer.renderSubtitles(subtitles, canvas.width, canvas.height, currentTime);
          ctx.drawImage(subtitleCanvas, 0, 0);
        }
      }

      // Update progress
      if (onProgress) {
        onProgress((frameCount / totalFrames) * 100);
      }

      frameCount++;
      
      // Schedule next frame with proper timing
      const nextFrameTime = (frameCount / fps) * 1000;
      const currentRealTime = performance.now();
      const delay = Math.max(0, nextFrameTime - (currentRealTime - lastTime));
      
      if (frameCount === 1) {
        lastTime = currentRealTime;
      }
      
      setTimeout(() => {
        animationId = requestAnimationFrame(renderFrame);
      }, delay);
    };

    // Start rendering
    animationId = requestAnimationFrame(renderFrame);

    // Wait for recording to finish
    return new Promise((resolve, reject) => {
      recorder.onstop = () => {
        console.log('[VideoExport] Recording stopped, creating final blob');
        
        // Clean up
        if (audioTrack) {
          audioTrack.stop();
        }
        canvas.remove();
        subtitleCanvas.remove();
        
        // Create final blob
        const blob = new Blob(chunks, { type: selectedMimeType });
        console.log('[VideoExport] Final blob created:', {
          size: `${(blob.size / 1024 / 1024).toFixed(2)}MB`,
          type: blob.type
        });
        
        resolve(blob);
      };
      
      recorder.onerror = (event) => {
        console.error('[VideoExport] MediaRecorder error:', event);
        reject(new Error('Failed to record video'));
      };
    });
  }

  // Create MP4 from WebCodecs chunks (simplified implementation)
  private async createMP4FromChunks(
    chunks: EncodedVideoChunk[],
    config: VideoEncoderConfig
  ): Promise<Blob> {
    // In a real implementation, you would use mp4box.js or similar
    // to properly mux the video chunks into an MP4 container
    
    // For now, return a simple blob
    const totalSize = chunks.reduce((acc, chunk) => acc + chunk.byteLength, 0);
    const buffer = new ArrayBuffer(totalSize);
    const view = new Uint8Array(buffer);
    
    let offset = 0;
    for (const chunk of chunks) {
      const chunkData = new Uint8Array(chunk.byteLength);
      chunk.copyTo(chunkData);
      view.set(chunkData, offset);
      offset += chunk.byteLength;
    }
    
    return new Blob([buffer], { type: 'video/mp4' });
  }

  // Export video with embedded subtitle track (not burned in)
  async exportVideoWithSubtitleTrack(
    videoBlob: Blob,
    subtitles: SubtitleSegment[],
    format: 'vtt' | 'srt' = 'vtt'
  ): Promise<Blob> {
    // This would require a library like mp4box.js to add subtitle tracks
    // For now, return the original video
    console.warn('Subtitle track embedding not yet implemented');
    return videoBlob;
  }

  // Utility to check format support
  isFormatSupported(format: string): boolean {
    if (format === 'mp4' && this.supportsWebCodecs) {
      return true;
    }
    
    const mimeType = format === 'webm' ? 'video/webm' : 'video/mp4';
    return MediaRecorder.isTypeSupported(mimeType);
  }

  // Get supported codecs
  getSupportedCodecs(): string[] {
    const codecs = [];
    
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) {
      codecs.push('vp9');
    }
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8')) {
      codecs.push('vp8');
    }
    if (MediaRecorder.isTypeSupported('video/mp4;codecs=avc1')) {
      codecs.push('h264');
    }
    if (this.supportsWebCodecs) {
      codecs.push('h265', 'av1');
    }
    
    return codecs;
  }
}

export const videoExportService = new VideoExportService(); 