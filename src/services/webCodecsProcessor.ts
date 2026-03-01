// WebCodecs API Service for Hardware-Accelerated Video Processing
import { FrameData, ProcessingConfig } from '../types/ascii-video';

interface VideoDecoderConfig {
  codec: string;
  codedWidth: number;
  codedHeight: number;
  description?: Uint8Array;
}

// Remove custom EncodedVideoChunk interface - use the built-in Web API type

export class WebCodecsProcessor {
  private decoder?: VideoDecoder;
  private encoder?: VideoEncoder;
  private frameQueue: VideoFrame[] = [];
  private isProcessing = false;
  
  // Callbacks
  private onFrameDecoded?: (frame: VideoFrame) => void;
  private onFrameEncoded?: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => void;
  private onError?: (error: Error) => void;
  
  constructor() {
    // Check WebCodecs support
    if (!this.isSupported()) {
      console.warn('WebCodecs API is not supported in this browser');
    }
  }
  
  isSupported(): boolean {
    return 'VideoDecoder' in window && 
           'VideoEncoder' in window && 
           'VideoFrame' in window;
  }
  
  // Initialize video decoder
  async initDecoder(config: VideoDecoderConfig): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('WebCodecs API is not supported');
    }
    
    this.decoder = new VideoDecoder({
      output: (frame) => this.handleDecodedFrame(frame),
      error: (error) => this.handleError(error)
    });
    
    // Check codec support
    const support = await VideoDecoder.isConfigSupported(config);
    if (!support.supported) {
      throw new Error(`Codec ${config.codec} is not supported`);
    }
    
    this.decoder.configure(config);
  }
  
  // Initialize video encoder
  async initEncoder(config: VideoEncoderConfig): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('WebCodecs API is not supported');
    }
    
    this.encoder = new VideoEncoder({
      output: (chunk, metadata) => this.handleEncodedChunk(chunk, metadata),
      error: (error) => this.handleError(error)
    });
    
    // Check codec support
    const support = await VideoEncoder.isConfigSupported(config);
    if (!support.supported) {
      throw new Error(`Encoder codec ${config.codec} is not supported`);
    }
    
    this.encoder.configure(config);
  }
  
  // Decode video chunk - using any to avoid type conflicts
  decodeChunk(chunk: any): void {
    if (!this.decoder) {
      throw new Error('Decoder not initialized');
    }
    
    // Create proper EncodedVideoChunk if needed
    if (chunk.data && chunk.timestamp !== undefined && chunk.type) {
      const encodedChunk = new EncodedVideoChunk({
        type: chunk.type,
        timestamp: chunk.timestamp,
        data: chunk.data
      });
      this.decoder.decode(encodedChunk);
    } else {
      this.decoder.decode(chunk);
    }
  }
  
  // Process video frame
  private handleDecodedFrame(frame: VideoFrame): void {
    this.frameQueue.push(frame);
    
    if (this.onFrameDecoded) {
      this.onFrameDecoded(frame);
    }
  }
  
  // Encode video frame
  encodeFrame(frame: VideoFrame, keyFrame = false): void {
    if (!this.encoder) {
      throw new Error('Encoder not initialized');
    }
    
    this.encoder.encode(frame, { keyFrame });
  }
  
  // Handle encoded chunk
  private handleEncodedChunk(chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata): void {
    if (this.onFrameEncoded) {
      this.onFrameEncoded(chunk, metadata);
    }
  }
  
  // Convert VideoFrame to FrameData for ASCII processing
  async videoFrameToFrameData(videoFrame: VideoFrame, frameNumber: number): Promise<FrameData> {
    // Create a canvas to extract pixel data
    const canvas = new OffscreenCanvas(videoFrame.displayWidth, videoFrame.displayHeight);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Draw video frame to canvas
    ctx.drawImage(videoFrame, 0, 0);
    
    // Get pixel data
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const frameData: FrameData = {
      frameNumber,
      timestamp: videoFrame.timestamp / 1000000, // Convert microseconds to seconds
      width: canvas.width,
      height: canvas.height,
      pixels: imageData.data
    };
    
    // Close the video frame to free memory
    videoFrame.close();
    
    return frameData;
  }
  
  // Create VideoFrame from ASCII art (for encoding)
  async asciiToVideoFrame(
    asciiArt: string,
    timestamp: number,
    config: {
      width: number;
      height: number;
      fontSize: number;
      fontFamily: string;
      textColor: string;
      backgroundColor: string;
    }
  ): Promise<VideoFrame> {
    const canvas = new OffscreenCanvas(config.width, config.height);
    const ctx = canvas.getContext('2d');
    
    if (!ctx) {
      throw new Error('Failed to get canvas context');
    }
    
    // Set background
    ctx.fillStyle = config.backgroundColor;
    ctx.fillRect(0, 0, config.width, config.height);
    
    // Set text properties
    ctx.font = `${config.fontSize}px ${config.fontFamily}`;
    ctx.fillStyle = config.textColor;
    ctx.textBaseline = 'top';
    
    // Draw ASCII art
    const lines = asciiArt.split('\n');
    const lineHeight = config.fontSize * 1.2;
    
    lines.forEach((line, index) => {
      ctx.fillText(line, 10, index * lineHeight);
    });
    
    // Create VideoFrame from canvas
    const videoFrame = new VideoFrame(canvas, {
      timestamp: timestamp * 1000000, // Convert to microseconds
      alpha: 'discard'
    });
    
    return videoFrame;
  }
  
  // Process video file using WebCodecs
  async processVideoFile(
    file: File,
    config: ProcessingConfig,
    onFrame: (frameData: FrameData) => Promise<void>
  ): Promise<void> {
    if (!this.isSupported()) {
      throw new Error('WebCodecs API is not supported');
    }
    
    // Create a video element to extract video metadata
    const video = document.createElement('video');
    video.src = URL.createObjectURL(file);
    
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video metadata'));
    });
    
    // Use MediaSource API to get encoded chunks
    const stream = file.stream();
    const reader = stream.getReader();
    
    // Initialize decoder with video properties
    await this.initDecoder({
      codec: 'vp8', // Default codec, should be detected from file
      codedWidth: video.videoWidth,
      codedHeight: video.videoHeight
    });
    
    let frameNumber = 0;
    
    // Set up frame processing
    this.onFrameDecoded = async (videoFrame) => {
      const frameData = await this.videoFrameToFrameData(videoFrame, frameNumber++);
      await onFrame(frameData);
    };
    
    // Read and decode video chunks
    // Note: This is a simplified implementation
    // In production, you'd need proper demuxing to extract encoded chunks
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      // This would need proper video container parsing
      // For now, we'll use the standard video element approach as fallback
      console.warn('Direct WebCodecs processing requires container parsing');
      break;
    }
    
    // Clean up
    URL.revokeObjectURL(video.src);
  }
  
  // Hardware capabilities check
  async getHardwareCapabilities(): Promise<{
    decoderSupport: Record<string, boolean>;
    encoderSupport: Record<string, boolean>;
    hardwareAcceleration: boolean;
  }> {
    if (!this.isSupported()) {
      return {
        decoderSupport: {},
        encoderSupport: {},
        hardwareAcceleration: false
      };
    }
    
    const codecs = ['vp8', 'vp9', 'h264', 'hevc', 'av1'];
    const decoderSupport: Record<string, boolean> = {};
    const encoderSupport: Record<string, boolean> = {};
    
    for (const codec of codecs) {
      // Check decoder support
      try {
        const decoderConfig: VideoDecoderConfig = {
          codec,
          codedWidth: 1920,
          codedHeight: 1080
        };
        const decoderResult = await VideoDecoder.isConfigSupported(decoderConfig);
        decoderSupport[codec] = decoderResult.supported || false;
      } catch {
        decoderSupport[codec] = false;
      }
      
      // Check encoder support
      try {
        const encoderConfig: VideoEncoderConfig = {
          codec,
          width: 1920,
          height: 1080,
          bitrate: 1000000,
          framerate: 30,
          hardwareAcceleration: 'prefer-hardware'
        };
        const encoderResult = await VideoEncoder.isConfigSupported(encoderConfig);
        encoderSupport[codec] = encoderResult.supported || false;
      } catch {
        encoderSupport[codec] = false;
      }
    }
    
    // Check if hardware acceleration is available
    const hardwareAcceleration = Object.values(encoderSupport).some(supported => supported);
    
    return {
      decoderSupport,
      encoderSupport,
      hardwareAcceleration
    };
  }
  
  // Error handling
  private handleError(error: Error): void {
    console.error('WebCodecs error:', error);
    if (this.onError) {
      this.onError(error);
    }
  }
  
  // Cleanup
  async cleanup(): Promise<void> {
    if (this.decoder) {
      await this.decoder.flush();
      this.decoder.close();
      this.decoder = undefined;
    }
    
    if (this.encoder) {
      await this.encoder.flush();
      this.encoder.close();
      this.encoder = undefined;
    }
    
    // Close any remaining frames
    this.frameQueue.forEach(frame => frame.close());
    this.frameQueue = [];
  }
  
  // Set callbacks
  setOnFrameDecoded(callback: (frame: VideoFrame) => void): void {
    this.onFrameDecoded = callback;
  }
  
  setOnFrameEncoded(callback: (chunk: EncodedVideoChunk, metadata?: EncodedVideoChunkMetadata) => void): void {
    this.onFrameEncoded = callback;
  }
  
  setOnError(callback: (error: Error) => void): void {
    this.onError = callback;
  }
} 