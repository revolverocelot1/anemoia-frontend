import type { TranscriptionOptions, TranscriptionResult } from '../types/subtitle';

interface TranscriptionProgress {
  status: 'loading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

// Model configurations
const WHISPER_MODELS: Record<string, string> = {
  'whisper-tiny': 'Xenova/whisper-tiny',
  'whisper-base': 'Xenova/whisper-base',
  'whisper-small': 'Xenova/whisper-small',
  'whisper-medium': 'Xenova/whisper-medium',
  'whisper-large': 'Xenova/whisper-large-v2',
  'whisper-tiny-en': 'Xenova/whisper-tiny.en',
  'whisper-base-en': 'Xenova/whisper-base.en',
};

class WhisperCDNService {
  private transcriber: any = null;
  private currentModel: string | null = null;
  private transformersLoaded = false;
  private pipeline: any = null;
  
  private async loadTransformersFromCDN() {
    if (this.transformersLoaded) return;
    
    // Create script element to load Transformers.js from CDN
    const script = document.createElement('script');
    script.type = 'module';
    script.textContent = `
      import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2';
      
      // Configure environment
      env.allowLocalModels = false;
      env.allowRemoteModels = true;
      env.remoteURL = 'https://huggingface.co/';
      
      // Make pipeline available globally
      window.__transformersPipeline = pipeline;
      window.__transformersEnv = env;
      window.__transformersLoaded = true;
    `;
    
    document.head.appendChild(script);
    
    // Wait for script to load
    let attempts = 0;
    while (!(window as any).__transformersLoaded && attempts < 50) {
      await new Promise(resolve => setTimeout(resolve, 100));
      attempts++;
    }
    
    if (!(window as any).__transformersLoaded) {
      throw new Error('Failed to load Transformers.js from CDN');
    }
    
    this.pipeline = (window as any).__transformersPipeline;
    this.transformersLoaded = true;
    console.log('[WhisperCDN] Transformers.js loaded from CDN');
  }
  
  async loadModel(modelName: string = 'whisper-tiny', onProgress?: (progress: TranscriptionProgress) => void): Promise<void> {
    try {
      await this.loadTransformersFromCDN();
      
      const modelPath = WHISPER_MODELS[modelName] || modelName;
      
      if (this.transcriber && this.currentModel === modelPath) {
        console.log('[WhisperCDN] Model already loaded:', modelPath);
        return;
      }
      
      console.log('[WhisperCDN] Loading model:', modelPath);
      onProgress?.({ status: 'loading', progress: 10, message: 'Initializing model...' });
      
      // Progress callback
      const progressCallback = (progress: any) => {
        console.log('[WhisperCDN] Progress:', progress);
        
        if (progress.status === 'progress' && progress.total) {
          const percent = Math.round((progress.loaded / progress.total) * 100);
          onProgress?.({
            status: 'loading',
            progress: Math.max(20, Math.min(90, percent)),
            message: `Downloading model: ${percent}% (${Math.round(progress.loaded / 1024 / 1024)}MB / ${Math.round(progress.total / 1024 / 1024)}MB)`
          });
        }
      };
      
      // Create transcription pipeline
      this.transcriber = await this.pipeline(
        'automatic-speech-recognition',
        modelPath,
        {
          progress_callback: progressCallback,
          // Don't specify quantized to let it choose the best available
          revision: 'main',
        }
      );
      
      this.currentModel = modelPath;
      onProgress?.({ status: 'complete', progress: 100, message: 'Model loaded successfully!' });
      console.log('[WhisperCDN] Model loaded successfully');
      
    } catch (error) {
      console.error('[WhisperCDN] Error loading model:', error);
      onProgress?.({ status: 'error', progress: 0, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
      throw error;
    }
  }
  
  async transcribe(
    file: File | Blob,
    options: Partial<TranscriptionOptions> = {},
    onProgress?: (progress: TranscriptionProgress) => void
  ): Promise<TranscriptionResult> {
    try {
      if (!this.transcriber) {
        await this.loadModel(options.model || 'whisper-tiny', onProgress);
      }
      
      console.log('[WhisperCDN] Starting transcription...');
      onProgress?.({ status: 'processing', progress: 10, message: 'Processing audio...' });
      
      // Convert file to audio URL
      const audioUrl = URL.createObjectURL(file);
      
      // Transcribe with options
      const transcriptionOptions: any = {
        task: options.task || 'transcribe',
        chunk_length_s: 30,
        return_timestamps: true,
        callback_function: (beams: any) => {
          // Progress during transcription
          const progress = Math.min(90, 10 + (beams.length * 10));
          onProgress?.({
            status: 'processing',
            progress,
            message: `Transcribing... ${beams.length} segments`
          });
        }
      };
      
      // Only add language if it's not 'auto'
      if (options.language && options.language !== 'auto') {
        transcriptionOptions.language = options.language;
      }
      
      const result = await this.transcriber(audioUrl, transcriptionOptions);
      
      // Clean up
      URL.revokeObjectURL(audioUrl);
      
      console.log('[WhisperCDN] Transcription result:', result);
      
      // Convert result to our format
      const segments = result.chunks?.map((chunk: any, index: number) => ({
        id: index,
        start: chunk.timestamp[0] || 0,
        end: chunk.timestamp[1] || chunk.timestamp[0] + 1,
        text: chunk.text.trim()
      })) || [];
      
      onProgress?.({ status: 'complete', progress: 100, message: 'Transcription complete!' });
      
      return {
        text: result.text || '',
        segments,
        language: result.language || options.language
      };
      
    } catch (error) {
      console.error('[WhisperCDN] Transcription error:', error);
      onProgress?.({ status: 'error', progress: 0, message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` });
      throw error;
    }
  }
  
  async cleanup(): Promise<void> {
    if (this.transcriber) {
      console.log('[WhisperCDN] Cleaning up...');
      // Dispose of the model if possible
      if (this.transcriber.dispose) {
        await this.transcriber.dispose();
      }
      this.transcriber = null;
      this.currentModel = null;
    }
  }
  
  async isModelDownloaded(modelId: string): Promise<boolean> {
    // CDN models are always available
    return true;
  }
  
  async downloadModel(modelId: string, onProgress?: (progress: number, status: string) => void): Promise<void> {
    // For CDN-based models, we don't need to download them explicitly
    // They are loaded on-demand when transcription starts
    const modelName = WHISPER_MODELS[modelId];
    if (!modelName) {
      throw new Error(`Unknown model: ${modelId}`);
    }
    
    // Simulate download progress for UI consistency
    onProgress?.(0, `Preparing ${modelId}...`);
    await new Promise(resolve => setTimeout(resolve, 100));
    onProgress?.(50, 'Model available via CDN');
    await new Promise(resolve => setTimeout(resolve, 100));
    onProgress?.(100, 'Ready to use');
  }
}

export const whisperCDNService = new WhisperCDNService(); 