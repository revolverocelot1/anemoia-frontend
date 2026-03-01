import * as ort from 'onnxruntime-web';
import { TranscriptionOptions, TranscriptionResult } from '../types/subtitle';
import { whisperLoader } from '../lib/whisper-loader';

// Configure ONNX Runtime
ort.env.wasm.wasmPaths = '/ort-wasm/';
ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;

interface WhisperModel {
  name: string;
  url: string;
  size: number; // in bytes
  description: string;
}

const WHISPER_MODELS: Record<string, WhisperModel> = {
  'whisper-tiny': {
    name: 'Whisper Tiny',
    url: 'https://huggingface.co/Xenova/whisper-tiny/resolve/main/onnx/encoder_model.onnx',
    size: 39 * 1024 * 1024, // 39MB
    description: 'Fastest, least accurate'
  },
  'whisper-base': {
    name: 'Whisper Base',
    url: 'https://huggingface.co/Xenova/whisper-base/resolve/main/onnx/encoder_model.onnx',
    size: 74 * 1024 * 1024, // 74MB
    description: 'Good balance of speed and accuracy'
  },
  'whisper-small': {
    name: 'Whisper Small',
    url: 'https://huggingface.co/Xenova/whisper-small/resolve/main/onnx/encoder_model.onnx',
    size: 244 * 1024 * 1024, // 244MB
    description: 'Better accuracy, slower'
  }
};

class WhisperService {
  private models: Map<string, ort.InferenceSession> = new Map();
  private audioContext: AudioContext | null = null;
  private downloadProgress: Map<string, number> = new Map();
  private downloadCallbacks: Map<string, (progress: number, status: string) => void> = new Map();

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
    }
  }

  public getAvailableModels() {
    return Object.entries(WHISPER_MODELS).map(([id, model]) => ({
      id,
      ...model,
      downloaded: this.models.has(id),
      downloadProgress: this.downloadProgress.get(id) || 0
    }));
  }

  public async loadModel(
    modelId: string,
    onProgress?: (progress: number, status?: string) => void
  ): Promise<void> {
    // Use whisperLoader to load the model
    if (whisperLoader.isModelLoaded(modelId)) {
      onProgress?.(100, 'Model already loaded');
      return;
    }
    
    const progressHandler = (event: MessageEvent) => {
      const { type, progress, status } = event.data;
      if (type === 'progress') {
        onProgress?.(progress, status);
      }
    };
    
    whisperLoader.addMessageListener(progressHandler);
    
    try {
      await whisperLoader.loadModel(modelId);
      onProgress?.(100, 'Model loaded successfully');
    } finally {
      whisperLoader.removeMessageListener(progressHandler);
    }
  }

  public isModelLoaded(modelId?: string): boolean {
    if (modelId) {
      return whisperLoader.isModelLoaded(modelId);
    }
    // Check if any model is loaded
    return whisperLoader.isModelLoaded('whisper-tiny') || 
           whisperLoader.isModelLoaded('whisper-base') || 
           whisperLoader.isModelLoaded('whisper-small');
  }

  public async downloadModel(
    modelId: string, 
    onProgress?: (progress: number, status: string) => void
  ): Promise<void> {
    const model = WHISPER_MODELS[modelId];
    if (!model) {
      throw new Error(`Unknown model: ${modelId}`);
    }

    if (this.models.has(modelId)) {
      onProgress?.(100, 'Model already loaded');
      return;
    }

    try {
      // Set up progress callback
      if (onProgress) {
        this.downloadCallbacks.set(modelId, onProgress);
      }

      onProgress?.(0, `Downloading ${model.name}...`);

      // Check if model is cached in IndexedDB
      const cachedModel = await this.getCachedModel(modelId);
      if (cachedModel) {
        onProgress?.(50, 'Loading from cache...');
        const session = await ort.InferenceSession.create(cachedModel);
        this.models.set(modelId, session);
        onProgress?.(100, 'Model loaded from cache');
        return;
      }

      // Download model
      const response = await fetch(model.url);
      if (!response.ok) {
        throw new Error(`Failed to download model: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const contentLength = parseInt(response.headers.get('Content-Length') || `${model.size}`);
      const chunks: Uint8Array[] = [];
      let receivedLength = 0;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        chunks.push(value);
        receivedLength += value.length;

        const progress = Math.round((receivedLength / contentLength) * 100);
        this.downloadProgress.set(modelId, progress);
        onProgress?.(progress * 0.8, `Downloading... ${this.formatBytes(receivedLength)} / ${this.formatBytes(contentLength)}`);
      }

      // Combine chunks
      const modelData = new Uint8Array(receivedLength);
      let position = 0;
      for (const chunk of chunks) {
        modelData.set(chunk, position);
        position += chunk.length;
      }

      onProgress?.(85, 'Caching model...');
      
      // Cache model in IndexedDB
      await this.cacheModel(modelId, modelData);

      onProgress?.(90, 'Loading model...');

      // Create ONNX session
      const session = await ort.InferenceSession.create(modelData.buffer);
      this.models.set(modelId, session);

      onProgress?.(100, 'Model loaded successfully');
      this.downloadProgress.set(modelId, 100);

    } catch (error) {
      this.downloadProgress.delete(modelId);
      throw error;
    } finally {
      this.downloadCallbacks.delete(modelId);
    }
  }

  public async transcribe(
    audioData: ArrayBuffer,
    options: TranscriptionOptions,
    onProgress?: (progress: number, status: string) => void
  ): Promise<TranscriptionResult> {
    const modelId = options.model || 'whisper-base';
    
    console.log(`[WhisperService] Starting transcription with model: ${modelId}`);
    
    try {
      onProgress?.(10, 'Checking audio data...');
      
      if (!audioData || audioData.byteLength === 0) {
        throw new Error('No audio data provided');
      }
      
      console.log(`[WhisperService] Processing audio data: ${(audioData.byteLength / 1024 / 1024).toFixed(2)}MB`);
      
      onProgress?.(20, 'Processing audio...');
      
      // Process audio to get proper format for Whisper
      const audioFloat32 = await this.processAudio(audioData);
      
      if (!audioFloat32 || audioFloat32.length === 0) {
        throw new Error('Failed to process audio data');
      }
      
      console.log(`[WhisperService] Audio processed: ${audioFloat32.length} samples (${(audioFloat32.length / 16000).toFixed(2)}s at 16kHz)`);
      
      onProgress?.(30, 'Loading AI model...');
      
      // Load the model if not already loaded
      if (!whisperLoader.isModelLoaded(modelId)) {
        console.log(`[WhisperService] Model ${modelId} not loaded, loading now...`);
        
        // Set up progress listener for model loading
        const modelProgressHandler = (event: MessageEvent) => {
          const { type, progress, status } = event.data;
          if (type === 'progress' && progress < 100) {
            // Scale model loading progress from 30-50%
            const scaledProgress = 30 + (progress * 0.2);
            onProgress?.(scaledProgress, status || 'Loading model...');
          }
        };
        
        whisperLoader.addMessageListener(modelProgressHandler);
        
        try {
          await whisperLoader.loadModel(modelId);
          console.log(`[WhisperService] Model ${modelId} loaded successfully`);
        } finally {
          whisperLoader.removeMessageListener(modelProgressHandler);
        }
      }
      
      onProgress?.(50, 'Running AI transcription...');
      
      // Create a promise to handle the transcription result
      return new Promise<TranscriptionResult>((resolve, reject) => {
        let transcriptionStarted = false;
        const timeoutDuration = 300000; // 5 minutes timeout
        
        const timeout = setTimeout(() => {
          whisperLoader.removeMessageListener(messageHandler);
          reject(new Error('Transcription timeout. The audio might be too long or the model might be struggling.'));
        }, timeoutDuration);
        
        const messageHandler = (event: MessageEvent) => {
          const { type, progress, status, result, error } = event.data;
          
          console.log(`[WhisperService] Worker message:`, { type, progress, status });
          
          if (type === 'transcribe-progress') {
            transcriptionStarted = true;
            // Scale transcription progress from 50-90%
            const scaledProgress = 50 + (progress * 0.4);
            onProgress?.(scaledProgress, status || 'Transcribing...');
            
          } else if (type === 'transcribe-complete' && result) {
            clearTimeout(timeout);
            whisperLoader.removeMessageListener(messageHandler);
            
            console.log('[WhisperService] Transcription complete:', result);
            onProgress?.(95, 'Processing results...');
            
            // Format the result properly
            const formattedResult: TranscriptionResult = {
              text: result.text || '',
              segments: result.segments || [],
              language: result.language || options.language || 'en'
            };
            
            // Ensure segments have proper format
            if (formattedResult.segments.length === 0 && formattedResult.text) {
              // If no segments but we have text, create a single segment
              formattedResult.segments = [{
                start: 0,
                end: audioFloat32.length / 16000, // Duration in seconds
                text: formattedResult.text,
                confidence: 0.9
              }];
            }
            
            onProgress?.(100, 'Transcription complete');
            resolve(formattedResult);
            
          } else if (type === 'error') {
            clearTimeout(timeout);
            whisperLoader.removeMessageListener(messageHandler);
            
            console.error('[WhisperService] Transcription error:', error);
            reject(new Error(error || 'Transcription failed'));
          }
        };
        
        // Add message listener
        whisperLoader.addMessageListener(messageHandler);
        
        try {
          // Start transcription
          console.log('[WhisperService] Sending audio to worker for transcription...');
          whisperLoader.transcribe(audioFloat32, {
            language: options.language || 'auto',
            task: options.task || 'transcribe',
            return_timestamps: true,
            chunk_length_s: 30,
            stride_length_s: 5
          });
          
          // Give it a moment to check if transcription starts
          setTimeout(() => {
            if (!transcriptionStarted) {
              console.warn('[WhisperService] Transcription may not have started properly');
            }
          }, 5000);
          
        } catch (error) {
          clearTimeout(timeout);
          whisperLoader.removeMessageListener(messageHandler);
          throw error;
        }
      });
      
    } catch (error) {
      console.error('[WhisperService] Transcription failed:', error);
      onProgress?.(0, `Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }
  
  private async processAudio(audioData: ArrayBuffer): Promise<Float32Array> {
    try {
      if (!this.audioContext) {
        console.log('[Whisper] Initializing AudioContext...');
        this.initAudioContext();
      }
      
      if (!this.audioContext) {
        throw new Error('AudioContext not available');
      }

      console.log('[Whisper] Decoding audio data...');
      
      // Clone the buffer to avoid detached ArrayBuffer issues
      const audioDataCopy = audioData.slice(0);
      
      // Decode audio data
      const audioBuffer = await this.audioContext.decodeAudioData(audioDataCopy);
      
      console.log(`[Whisper] Audio decoded: ${audioBuffer.duration}s, ${audioBuffer.sampleRate}Hz`);
      
      // Get mono channel at 16kHz
      const channelData = audioBuffer.getChannelData(0);
      
      // Resample to 16kHz if needed
      if (audioBuffer.sampleRate !== 16000) {
        console.log(`[Whisper] Resampling from ${audioBuffer.sampleRate}Hz to 16000Hz`);
        return this.resample(channelData, audioBuffer.sampleRate, 16000);
      }
      
      return channelData;
      
    } catch (error) {
      console.error('[Whisper] Audio processing failed:', error);
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

  private async processResults(
    results: ort.InferenceSession.OnnxValueMapType,
    options: TranscriptionOptions
  ): Promise<TranscriptionResult> {
    // Process ONNX results - this is a simplified implementation
    // In a real Whisper implementation, you would:
    // 1. Process the output logits
    // 2. Apply tokenization/decoding
    // 3. Extract timestamps
    
    // For now, throw an error indicating proper implementation needed
    throw new Error('Whisper model processing not fully implemented. Please use a proper Whisper ONNX implementation.');
  }

  private async getCachedModel(modelId: string): Promise<ArrayBuffer | null> {
    try {
      const db = await this.openModelDB();
      const transaction = db.transaction(['models'], 'readonly');
      const store = transaction.objectStore('models');
      const request = store.get(modelId);
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result?.data || null);
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error reading cached model:', error);
      return null;
    }
  }

  private async cacheModel(modelId: string, data: Uint8Array): Promise<void> {
    try {
      const db = await this.openModelDB();
      const transaction = db.transaction(['models'], 'readwrite');
      const store = transaction.objectStore('models');
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({
          id: modelId,
          data: data.buffer,
          timestamp: Date.now()
        });
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
    } catch (error) {
      console.error('Error caching model:', error);
    }
  }

  private async openModelDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('WhisperModels', 1);
      
      request.onerror = () => reject(request.error);
      request.onsuccess = () => resolve(request.result);
      
      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains('models')) {
          db.createObjectStore('models', { keyPath: 'id' });
        }
      };
    });
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  private prepareAudioTensor(audioData: ArrayBuffer): ort.Tensor {
    // Convert ArrayBuffer to Float32Array
    const audioFloat32 = new Float32Array(audioData);
    
    // Create ONNX tensor
    return new ort.Tensor('float32', audioFloat32, [1, audioFloat32.length]);
  }

  public async extractAudioFromVideo(videoFile: File): Promise<ArrayBuffer> {
    console.log('[WhisperService] Starting audio extraction from video:', {
      fileName: videoFile.name,
      fileSize: `${(videoFile.size / 1024 / 1024).toFixed(2)}MB`,
      fileType: videoFile.type
    });
    
    try {
      // Dynamic imports with proper error handling
      console.log('[WhisperService] Loading FFmpeg modules...');
      let FFmpeg: any;
      let fetchFile: any;
      let toBlobURL: any;
      
      try {
        const ffmpegModule = await import('@ffmpeg/ffmpeg');
        FFmpeg = ffmpegModule.FFmpeg;
        console.log('[WhisperService] FFmpeg module loaded successfully');
      } catch (error) {
        console.error('[WhisperService] Failed to import FFmpeg module:', error);
        throw new Error('Failed to load FFmpeg module. Please ensure @ffmpeg/ffmpeg is installed.');
      }
      
      try {
        const utilModule = await import('@ffmpeg/util');
        fetchFile = utilModule.fetchFile;
        toBlobURL = utilModule.toBlobURL;
        console.log('[WhisperService] FFmpeg util module loaded successfully');
      } catch (error) {
        console.error('[WhisperService] Failed to import FFmpeg util module:', error);
        throw new Error('Failed to load FFmpeg util module. Please ensure @ffmpeg/util is installed.');
      }
      
      const ffmpeg = new FFmpeg();
      
      // Add FFmpeg logging
      ffmpeg.on('log', ({ message }: { message: string }) => {
        console.log('[FFmpeg Log]:', message);
      });
      
      ffmpeg.on('progress', ({ progress, time }: { progress: number; time: number }) => {
        console.log(`[FFmpeg Progress]: ${(progress * 100).toFixed(2)}% (time: ${time}ms)`);
      });
      
      // Load FFmpeg with improved error handling
      if (!ffmpeg.loaded) {
        console.log('[WhisperService] FFmpeg not loaded, attempting to load...');
        
        try {
          // Try CDN first (more reliable)
          console.log('[WhisperService] Attempting to load FFmpeg from CDN...');
          const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
          await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          });
          console.log('[WhisperService] FFmpeg loaded successfully from CDN');
        } catch (cdnError) {
          console.error('[WhisperService] Failed to load FFmpeg from CDN:', cdnError);
          
          // Try local files as fallback
          console.log('[WhisperService] Attempting to load FFmpeg from local files...');
          try {
            const origin = window.location.origin;
            const ffmpegCoreResponse = await fetch(`${origin}/ffmpeg/ffmpeg-core.js`);
            const ffmpegWasmResponse = await fetch(`${origin}/ffmpeg/ffmpeg-core.wasm`);
            
            if (!ffmpegCoreResponse.ok || !ffmpegWasmResponse.ok) {
              throw new Error('Failed to fetch FFmpeg files');
            }
            
            const coreBlob = await ffmpegCoreResponse.blob();
            const wasmBlob = await ffmpegWasmResponse.blob();
            
            await ffmpeg.load({
              coreURL: URL.createObjectURL(coreBlob),
              wasmURL: URL.createObjectURL(wasmBlob)
            });
            
            console.log('[WhisperService] FFmpeg loaded successfully from local files');
          } catch (localError) {
            console.error('[WhisperService] Failed to load FFmpeg from local:', localError);
            throw new Error('FFmpeg failed to load from both CDN and local files. Please check your internet connection.');
          }
        }
      } else {
        console.log('[WhisperService] FFmpeg already loaded');
      }

      console.log('[WhisperService] Writing video file to FFmpeg filesystem...');
      // Write video file to FFmpeg filesystem
      await ffmpeg.writeFile('input.mp4', await fetchFile(videoFile));
      console.log('[WhisperService] Video file written successfully');
      
      console.log('[WhisperService] Extracting audio with FFmpeg...');
      // Extract audio as WAV with 16kHz sample rate (required for Whisper)
      await ffmpeg.exec([
        '-i', 'input.mp4',
        '-vn', // No video
        '-acodec', 'pcm_s16le', // PCM 16-bit little-endian
        '-ar', '16000', // 16kHz sample rate
        '-ac', '1', // Mono
        'output.wav'
      ]);
      
      console.log('[WhisperService] Audio extraction completed');
      
      // Read the output audio file
      const audioData = await ffmpeg.readFile('output.wav');
      console.log('[WhisperService] Audio data read:', {
        type: typeof audioData,
        size: audioData instanceof Uint8Array ? `${(audioData.byteLength / 1024).toFixed(2)}KB` : 'unknown'
      });
      
      // Clean up
      await ffmpeg.deleteFile('input.mp4');
      await ffmpeg.deleteFile('output.wav');
      console.log('[WhisperService] Cleanup completed');
      
      // Convert to ArrayBuffer (audioData is Uint8Array)
      let buffer: ArrayBuffer;
      if (audioData instanceof Uint8Array) {
        buffer = audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength);
      } else {
        // If it's a string (base64), convert it
        const binaryString = atob(audioData as string);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        buffer = bytes.buffer;
      }
      
      console.log('[WhisperService] Audio buffer prepared:', {
        totalSize: `${(buffer.byteLength / 1024).toFixed(2)}KB`,
        pcmSize: `${((buffer.byteLength - 44) / 1024).toFixed(2)}KB` // Minus WAV header
      });
      
      // Skip WAV header (44 bytes) and return raw PCM data
      return buffer.slice(44);
      
    } catch (error) {
      console.error('[WhisperService] Error in extractAudioFromVideo:', error);
      
      // Provide more specific error messages
      if (error instanceof Error) {
        if (error.message.includes('SharedArrayBuffer')) {
          throw new Error('FFmpeg requires SharedArrayBuffer which is not available. Please ensure your site is served with proper CORS headers or try a different browser.');
        } else if (error.message.includes('fetch')) {
          throw new Error('Failed to load FFmpeg files. Please check your internet connection and ensure the files exist in /public/ffmpeg/');
        }
      }
      
      throw new Error(`Failed to extract audio from video: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async extractAudioWithWebAudioAPI(videoFile: File): Promise<ArrayBuffer> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async () => {
        try {
          // For now, return mock audio data since OfflineAudioContext doesn't support createMediaElementSource
          // In a real implementation, you would use AudioWorklet or other Web Audio API features
          const sampleRate = 16000;
          const duration = 10; // 10 seconds
          const samples = sampleRate * duration;
          const audioData = new Float32Array(samples);
          
          // Generate silence or simple test tone
          for (let i = 0; i < samples; i++) {
            audioData[i] = 0; // Silence
          }
          
          resolve(audioData.buffer);
        } catch (error) {
          reject(new Error(`Failed to process audio: ${error}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error('Failed to read video file'));
      };
      
      reader.readAsArrayBuffer(videoFile);
    });
  }
}

// Export singleton instance
export const whisperService = new WhisperService();
export default whisperService; 