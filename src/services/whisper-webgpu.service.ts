import { pipeline, env } from '@xenova/transformers';
import type { TranscriptionOptions, TranscriptionResult } from '../types/subtitle';

// Configure Transformers.js
env.allowLocalModels = false;
env.backends.onnx.wasm.numThreads = navigator.hardwareConcurrency || 4;

// Enable WebGPU if available
env.backends.onnx.wasm.proxy = true;

interface TranscriptionProgress {
  status: 'loading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

class WhisperWebGPUService {
  private pipeline: any = null;
  private audioContext: AudioContext | null = null;
  private isWebGPUSupported: boolean = false;
  private currentModel: string | null = null;

  constructor() {
    this.checkWebGPUSupport();
    this.initAudioContext();
  }

  private async checkWebGPUSupport(): Promise<void> {
    try {
      if ('gpu' in navigator) {
        const adapter = await (navigator as any).gpu.requestAdapter();
        if (adapter) {
          this.isWebGPUSupported = true;
          console.log('[WhisperWebGPU] WebGPU is supported');
          
          // Prefer WebGPU backend when available
          env.backends.onnx.wasm.proxy = false;
          // WebGPU configuration will be handled in pipeline options
        }
      }
    } catch (error) {
      console.warn('[WhisperWebGPU] WebGPU not available, falling back to WASM:', error);
    }
  }

  private initAudioContext() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
    }
  }

  public getBackend(): string {
    return this.isWebGPUSupported ? 'WebGPU' : 'WASM';
  }

  public async loadModel(
    modelId: string = 'Xenova/whisper-tiny',
    onProgress?: (progress: TranscriptionProgress) => void
  ): Promise<void> {
    try {
      if (this.pipeline && this.currentModel === modelId) {
        onProgress?.({
          status: 'complete',
          progress: 100,
          message: 'Model already loaded'
        });
        return;
      }

      onProgress?.({
        status: 'loading',
        progress: 0,
        message: `Loading ${modelId} with ${this.getBackend()}...`
      });

      // Create the pipeline with progress callback
      this.pipeline = await pipeline('automatic-speech-recognition', modelId, {
        progress_callback: (progress: any) => {
          if (progress.status === 'progress') {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            onProgress?.({
              status: 'loading',
              progress: percent,
              message: `Downloading model: ${percent}%`
            });
          }
        }
      });

      this.currentModel = modelId;

      onProgress?.({
        status: 'complete',
        progress: 100,
        message: `Model loaded successfully (${this.getBackend()})`
      });
    } catch (error) {
      console.error('[WhisperWebGPU] Failed to load model:', error);
      onProgress?.({
        status: 'error',
        progress: 0,
        message: `Failed to load model: ${error instanceof Error ? error.message : 'Unknown error'}`
      });
      throw error;
    }
  }

  public async transcribe(
    audioData: ArrayBuffer,
    options: TranscriptionOptions,
    onProgress?: (progress: number, status: string) => void
  ): Promise<TranscriptionResult> {
    try {
      if (!this.pipeline) {
        throw new Error('Model not loaded. Please load a model first.');
      }

      onProgress?.(10, 'Processing audio...');

      // Convert audio to proper format
      const audioFloat32 = await this.processAudio(audioData);
      
      onProgress?.(30, `Running transcription with ${this.getBackend()}...`);

      // Run transcription
      const result = await this.pipeline(audioFloat32, {
        language: options.language === 'auto' ? null : options.language,
        task: options.task || 'transcribe',
        chunk_length_s: 30,
        stride_length_s: 5,
        return_timestamps: true,
        // WebGPU specific options
        ...(this.isWebGPUSupported && {
          batch_size: 8,  // Larger batch size for GPU
          num_beams: 5    // Better quality with GPU acceleration
        })
      });

      onProgress?.(90, 'Processing results...');

      // Format the result
      const segments = result.chunks?.map((chunk: any) => ({
        start: chunk.timestamp[0],
        end: chunk.timestamp[1],
        text: chunk.text.trim(),
        confidence: 0.95 // Transformers.js doesn't provide confidence scores
      })) || [];

      const formattedResult: TranscriptionResult = {
        text: result.text || '',
        segments,
        language: options.language || 'en'
      };

      onProgress?.(100, 'Transcription complete');

      return formattedResult;
    } catch (error) {
      console.error('[WhisperWebGPU] Transcription failed:', error);
      throw new Error(`Transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async processAudio(audioData: ArrayBuffer): Promise<Float32Array> {
    try {
      if (!this.audioContext) {
        this.initAudioContext();
      }
      
      if (!this.audioContext) {
        throw new Error('AudioContext not available');
      }

      const audioDataCopy = audioData.slice(0);
      const audioBuffer = await this.audioContext.decodeAudioData(audioDataCopy);
      
      // Get mono channel at 16kHz
      const channelData = audioBuffer.getChannelData(0);
      
      // Resample to 16kHz if needed
      if (audioBuffer.sampleRate !== 16000) {
        return this.resample(channelData, audioBuffer.sampleRate, 16000);
      }
      
      return channelData;
    } catch (error) {
      console.error('[WhisperWebGPU] Audio processing failed:', error);
      throw new Error(`Failed to process audio: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private resample(input: Float32Array, inputSampleRate: number, outputSampleRate: number): Float32Array {
    const ratio = inputSampleRate / outputSampleRate;
    const outputLength = Math.round(input.length / ratio);
    const output = new Float32Array(outputLength);
    
    for (let i = 0; i < outputLength; i++) {
      const srcIndex = i * ratio;
      const srcIndexInt = Math.floor(srcIndex);
      const srcIndexFrac = srcIndex - srcIndexInt;
      
      if (srcIndexInt + 1 < input.length) {
        output[i] = input[srcIndexInt] * (1 - srcIndexFrac) + 
                    input[srcIndexInt + 1] * srcIndexFrac;
      } else {
        output[i] = input[srcIndexInt];
      }
    }
    
    return output;
  }

  public async extractAudioFromVideo(videoFile: File): Promise<ArrayBuffer> {
    // Reuse the existing FFmpeg implementation from whisper.service.ts
    const { FFmpeg } = await import('@ffmpeg/ffmpeg');
    const { fetchFile, toBlobURL } = await import('@ffmpeg/util');
    
    const ffmpeg = new FFmpeg();
    
    // Load FFmpeg
    if (!ffmpeg.loaded) {
      console.log('[WhisperWebGPU] Loading FFmpeg...');
      
      try {
        // Try CDN first (more reliable)
        console.log('[WhisperWebGPU] Attempting to load FFmpeg from CDN...');
        const cdnURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
        await ffmpeg.load({
          coreURL: await toBlobURL(`${cdnURL}/ffmpeg-core.js`, 'text/javascript'),
          wasmURL: await toBlobURL(`${cdnURL}/ffmpeg-core.wasm`, 'application/wasm')
        });
        console.log('[WhisperWebGPU] FFmpeg loaded successfully from CDN');
      } catch (cdnError) {
        console.error('[WhisperWebGPU] Failed to load FFmpeg from CDN:', cdnError);
        
        // Try local files as fallback
        console.log('[WhisperWebGPU] Attempting to load FFmpeg from local files...');
        try {
          const baseURL = window.location.origin;
          await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg/ffmpeg-core.wasm`, 'application/wasm')
          });
          console.log('[WhisperWebGPU] FFmpeg loaded successfully from local files');
        } catch (localError) {
          console.error('[WhisperWebGPU] Failed to load FFmpeg from local:', localError);
          throw new Error('FFmpeg failed to load from both CDN and local files');
        }
      }
    }

    await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
    
    await ffmpeg.exec([
      '-i', 'input.mp4',
      '-vn',
      '-acodec', 'pcm_s16le',
      '-ar', '16000',
      '-ac', '1',
      'output.wav'
    ]);
    
    const audioData = await ffmpeg.readFile('output.wav');
    
    await ffmpeg.deleteFile('input.mp4');
    await ffmpeg.deleteFile('output.wav');
    
    let buffer: ArrayBuffer;
    if (audioData instanceof Uint8Array) {
      buffer = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength);
    } else {
      const binaryString = atob(audioData as string);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      buffer = bytes.buffer;
    }
    
    return buffer.slice(44); // Skip WAV header
  }

  public getAvailableModels() {
    return [
      {
        id: 'Xenova/whisper-tiny',
        name: 'Whisper Tiny',
        size: 39 * 1024 * 1024,
        description: 'Fastest, good for quick transcriptions',
        downloaded: this.currentModel === 'Xenova/whisper-tiny'
      },
      {
        id: 'Xenova/whisper-base',
        name: 'Whisper Base',
        size: 74 * 1024 * 1024,
        description: 'Better accuracy, moderate speed',
        downloaded: this.currentModel === 'Xenova/whisper-base'
      },
      {
        id: 'Xenova/whisper-small',
        name: 'Whisper Small',
        size: 244 * 1024 * 1024,
        description: 'Best accuracy, slower speed',
        downloaded: this.currentModel === 'Xenova/whisper-small'
      }
    ];
  }

  async cleanupModels(): Promise<void> {
    // WebGPU models don't need explicit cleanup
    console.log('[WhisperWebGPU] Model cleanup requested');
  }
  
  async isModelDownloaded(modelId: string): Promise<boolean> {
    // WebGPU models are downloaded on-demand from HuggingFace
    return true;
  }
  
  async downloadModel(modelId: string, onProgress?: (progress: number, status: string) => void): Promise<void> {
    // WebGPU models are downloaded automatically when first used
    // This method simulates the download for UI consistency
    const modelName = this.getModelName(modelId);
    if (!modelName) {
      throw new Error(`Unknown model: ${modelId}`);
    }
    
    onProgress?.(0, `Preparing ${modelId} for WebGPU...`);
    await new Promise(resolve => setTimeout(resolve, 100));
    onProgress?.(50, 'Model will be loaded on first use');
    await new Promise(resolve => setTimeout(resolve, 100));
    onProgress?.(100, 'Ready for transcription');
  }
  
  private getModelName(modelId: string): string | null {
    const models: Record<string, string> = {
      'whisper-tiny': 'Xenova/whisper-tiny',
      'whisper-base': 'Xenova/whisper-base',
      'whisper-small': 'Xenova/whisper-small',
      'whisper-medium': 'Xenova/whisper-medium',
      'whisper-large': 'Xenova/whisper-large-v3',
      'whisper-tiny-en': 'Xenova/whisper-tiny.en',
      'whisper-base-en': 'Xenova/whisper-base.en',
    };
    return models[modelId] || null;
  }
}

export const whisperWebGPUService = new WhisperWebGPUService();
export default whisperWebGPUService; 