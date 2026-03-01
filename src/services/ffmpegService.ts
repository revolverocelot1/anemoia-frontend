// FFmpeg.wasm Service for Video Processing
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

export interface VideoInfo {
  duration: number;
  fps: number;
  width: number;
  height: number;
  codec: string;
  bitrate: number;
}

export interface FFmpegProgress {
  ratio: number;
  time: number;
  speed: number;
}

export class FFmpegService {
  private ffmpeg: FFmpeg;
  private loaded = false;
  private progressCallback?: (progress: FFmpegProgress) => void;
  
  constructor() {
    this.ffmpeg = new FFmpeg();
    this.setupProgressHandling();
  }
  
  private setupProgressHandling(): void {
    this.ffmpeg.on('log', ({ message }) => {
      console.log(message);
    });

    this.ffmpeg.on('progress', ({ progress, time }) => {
      console.log(`Progress: ${(progress * 100).toFixed(2)}%`);
      console.log(`Time: ${time / 1000000}s`);
    });
  }
  
  async load(): Promise<void> {
    if (this.loaded) return;
    
    try {
      // For FFmpeg 0.12.x, we need to use toBlobURL for loading
      console.log('Loading FFmpeg.wasm...');
      
      // First, try loading from CDN which is more reliable
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';
      
      await this.ffmpeg.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      
      this.loaded = true;
      console.log('FFmpeg.wasm loaded successfully');
    } catch (error) {
      console.error('Failed to load FFmpeg from CDN:', error);
      
      // Try alternative CDN URL
      try {
        console.log('Attempting alternative CDN URL...');
        const altBaseURL = 'https://unpkg.com/@ffmpeg/core-st@0.11.1/dist/umd';
        
        await this.ffmpeg.load({
          coreURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${altBaseURL}/ffmpeg-core.wasm`, 'application/wasm'),
        });
        
        this.loaded = true;
        console.log('FFmpeg.wasm loaded successfully from alternative CDN');
      } catch (altError) {
        console.error('Failed to load FFmpeg from alternative CDN:', altError);
        
        // Last resort: try local files
        try {
          console.log('Attempting to load FFmpeg from local files...');
          const base = import.meta.env.BASE_URL || '/';
          
          await this.ffmpeg.load({
            coreURL: await toBlobURL(`${base}ffmpeg/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${base}ffmpeg/ffmpeg-core.wasm`, 'application/wasm'),
          });
          
          this.loaded = true;
          console.log('FFmpeg.wasm loaded successfully from local files');
        } catch (localError) {
          console.error('Failed to load FFmpeg from local files:', localError);
          throw new Error('Failed to load FFmpeg. Please ensure you have an internet connection or that FFmpeg files are available locally.');
        }
      }
    }
  }
  
  // Get video information
  async getVideoInfo(file: File): Promise<VideoInfo> {
    await this.load();
    
    // Write file to FFmpeg file system
    await this.ffmpeg.writeFile('input.mp4', await fetchFile(file));
    
    // Run ffprobe-like command to get video info
    await this.ffmpeg.exec(['-i', 'input.mp4', '-hide_banner']);
    
    // Parse logs to extract video information
    // This is a simplified version - in production you'd parse the actual output
    const info: VideoInfo = {
      duration: 0,
      fps: 30,
      width: 1920,
      height: 1080,
      codec: 'h264',
      bitrate: 0
    };
    
    // Clean up
    await this.ffmpeg.deleteFile('input.mp4');
    
    return info;
  }
  
  // Extract frames from video
  async extractFrames(
    file: File,
    options: {
      fps?: number;
      scale?: number;
      startTime?: number;
      duration?: number;
      format?: 'png' | 'jpeg';
    } = {}
  ): Promise<Blob[]> {
    await this.load();
    
    const {
      fps = 30,
      scale = 1,
      startTime = 0,
      duration,
      format = 'png'
    } = options;
    
    // Write input file
    await this.ffmpeg.writeFile('input.mp4', await fetchFile(file));
    
    // Build FFmpeg command
    const args = ['-i', 'input.mp4'];
    
    if (startTime > 0) {
      args.push('-ss', startTime.toString());
    }
    
    if (duration) {
      args.push('-t', duration.toString());
    }
    
    // Video filters
    const filters: string[] = [];
    
    if (scale !== 1) {
      filters.push(`scale=iw*${scale}:ih*${scale}`);
    }
    
    if (filters.length > 0) {
      args.push('-vf', filters.join(','));
    }
    
    // Output settings
    args.push(
      '-r', fps.toString(),
      'frame_%04d.' + format
    );
    
    // Execute extraction
    await this.ffmpeg.exec(args);
    
    // Read extracted frames
    const frames: Blob[] = [];
    let frameIndex = 1;
    
    while (true) {
      const filename = `frame_${frameIndex.toString().padStart(4, '0')}.${format}`;
      
      try {
        const data = await this.ffmpeg.readFile(filename);
        const blob = new Blob([data], { type: `image/${format}` });
        frames.push(blob);
        
        // Clean up frame file
        await this.ffmpeg.deleteFile(filename);
        frameIndex++;
      } catch (error) {
        // No more frames
        break;
      }
    }
    
    // Clean up input file
    await this.ffmpeg.deleteFile('input.mp4');
    
    return frames;
  }
  
  // Convert video format
  async convertVideo(
    file: File,
    outputFormat: 'mp4' | 'webm' | 'avi' | 'mov',
    options: {
      codec?: string;
      bitrate?: string;
      fps?: number;
      scale?: number;
    } = {}
  ): Promise<Blob> {
    await this.load();
    
    const { codec, bitrate, fps, scale } = options;
    
    // Write input file
    await this.ffmpeg.writeFile('input', await fetchFile(file));
    
    // Build FFmpeg command
    const outputFile = `output.${outputFormat}`;
    const args = ['-i', 'input'];
    
    // Video codec
    if (codec) {
      args.push('-c:v', codec);
    }
    
    // Bitrate
    if (bitrate) {
      args.push('-b:v', bitrate);
    }
    
    // Frame rate
    if (fps) {
      args.push('-r', fps.toString());
    }
    
    // Scale
    if (scale && scale !== 1) {
      args.push('-vf', `scale=iw*${scale}:ih*${scale}`);
    }
    
    args.push(outputFile);
    
    // Execute conversion
    await this.ffmpeg.exec(args);
    
    // Read output file
    const data = await this.ffmpeg.readFile(outputFile);
    const blob = new Blob([data], { type: `video/${outputFormat}` });
    
    // Clean up
    await this.ffmpeg.deleteFile('input');
    await this.ffmpeg.deleteFile(outputFile);
    
    return blob;
  }
  
  // Create video from frames
  async createVideoFromFrames(
    frames: Blob[],
    options: {
      fps?: number;
      format?: 'mp4' | 'webm';
      codec?: string;
      quality?: number;
    } = {}
  ): Promise<Blob> {
    await this.load();
    
    const {
      fps = 30,
      format = 'mp4',
      codec = format === 'mp4' ? 'libx264' : 'libvpx-vp9',
      quality = 23
    } = options;
    
    // Write frames to FFmpeg file system
    for (let i = 0; i < frames.length; i++) {
      const filename = `frame_${(i + 1).toString().padStart(4, '0')}.png`;
      await this.ffmpeg.writeFile(filename, await fetchFile(frames[i]));
    }
    
    // Build FFmpeg command
    const outputFile = `output.${format}`;
    const args = [
      '-framerate', fps.toString(),
      '-i', 'frame_%04d.png',
      '-c:v', codec,
      '-crf', quality.toString(),
      '-pix_fmt', 'yuv420p',
      outputFile
    ];
    
    // Execute video creation
    await this.ffmpeg.exec(args);
    
    // Read output file
    const data = await this.ffmpeg.readFile(outputFile);
    const blob = new Blob([data], { type: `video/${format}` });
    
    // Clean up
    for (let i = 0; i < frames.length; i++) {
      const filename = `frame_${(i + 1).toString().padStart(4, '0')}.png`;
      await this.ffmpeg.deleteFile(filename);
    }
    await this.ffmpeg.deleteFile(outputFile);
    
    return blob;
  }
  
  // Create ASCII video
  async createAsciiVideo(
    asciiFrames: string[],
    options: {
      fps?: number;
      fontFamily?: string;
      fontSize?: number;
      backgroundColor?: string;
      textColor?: string;
      width?: number;
      height?: number;
    } = {}
  ): Promise<Blob> {
    await this.load();
    
    const {
      fps = 30,
      fontFamily = 'monospace',
      fontSize = 10,
      backgroundColor = 'black',
      textColor = '#00ff00',
      width = 1280,
      height = 720
    } = options;
    
    // Create canvas for rendering ASCII frames
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';
    
    // Convert ASCII frames to images
    const imageFrames: Blob[] = [];
    
    for (const asciiFrame of asciiFrames) {
      // Clear canvas
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, width, height);
      
      // Draw ASCII text
      ctx.fillStyle = textColor;
      const lines = asciiFrame.split('\n');
      
      lines.forEach((line, y) => {
        ctx.fillText(line, 10, y * fontSize * 1.2);
      });
      
      // Convert to blob
      const blob = await canvas.convertToBlob({ type: 'image/png' });
      imageFrames.push(blob);
    }
    
    // Create video from rendered frames
    return this.createVideoFromFrames(imageFrames, { fps });
  }
  
  // Set progress callback
  onProgress(callback: (progress: FFmpegProgress) => void): void {
    this.progressCallback = callback;
  }
  
  // Cancel current operation
  async cancel(): Promise<void> {
    if (this.ffmpeg) {
      await this.ffmpeg.terminate();
      this.ffmpeg = new FFmpeg();
      this.loaded = false;
      this.setupProgressHandling();
    }
  }
  
  // Check if FFmpeg is loaded
  isLoaded(): boolean {
    return this.loaded;
  }
} 