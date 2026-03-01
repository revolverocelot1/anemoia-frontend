import type { TranscriptionOptions, TranscriptionResult } from '../types/subtitle';

interface TranscriptionProgress {
  status: 'loading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

// Dynamically import transformers to avoid bundling issues
let pipeline: any = null;
let env: any = null;

async function loadTransformers() {
  if (!pipeline) {
    const transformers = await import('@xenova/transformers');
    pipeline = transformers.pipeline;
    env = transformers.env;
    
    // Configure environment exactly like the working test page
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    env.remoteURL = 'https://huggingface.co/';
  }
}

class WhisperMainThreadService {
  private transcriber: any = null;
  private currentModel: string | null = null;
  private isLoading = false;
  
  async loadModel(modelName: string = 'whisper-tiny', onProgress?: (progress: TranscriptionProgress) => void): Promise<void> {
    if (this.isLoading) {
      console.log('[WhisperMainThread] Model is already loading');
      return;
    }
    
    try {
      this.isLoading = true;
      
      // Load transformers if not already loaded
      await loadTransformers();
      
      const modelMap: Record<string, string> = {
        'whisper-tiny': 'Xenova/whisper-tiny',
        'whisper-base': 'Xenova/whisper-base',
        'whisper-small': 'Xenova/whisper-small',
        'whisper-medium': 'Xenova/whisper-medium',
        'whisper-large': 'Xenova/whisper-large-v2',
        'whisper-tiny-en': 'Xenova/whisper-tiny.en',
        'whisper-base-en': 'Xenova/whisper-base.en',
      };
      
      const modelPath = modelMap[modelName] || 'Xenova/whisper-tiny';
      
      if (this.transcriber && this.currentModel === modelPath) {
        console.log('[WhisperMainThread] Model already loaded:', modelPath);
        return;
      }
      
      console.log('[WhisperMainThread] Loading model:', modelPath);
      onProgress?.({ status: 'loading', progress: 10, message: 'Initializing model...' });
      
      // Create pipeline with progress callback
      this.transcriber = await pipeline(
        'automatic-speech-recognition',
        modelPath,
        {
          progress_callback: (progress: any) => {
            console.log('[WhisperMainThread] Progress:', progress);
            
            if (progress.status === 'progress' && progress.total) {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              onProgress?.({
                status: 'loading',
                progress: percent,
                message: `Downloading model: ${percent}%`
              });
            }
          }
        }
      );
      
      this.currentModel = modelPath;
      console.log('[WhisperMainThread] Model loaded successfully');
      
      onProgress?.({
        status: 'complete',
        progress: 100,
        message: 'Model loaded successfully'
      });
      
    } catch (error) {
      console.error('[WhisperMainThread] Failed to load model:', error);
      throw error;
    } finally {
      this.isLoading = false;
    }
  }
  
  async transcribe(
    file: File | Blob,
    options: Partial<TranscriptionOptions> = {},
    onProgress?: (progress: TranscriptionProgress) => void
  ): Promise<TranscriptionResult> {
    if (!this.transcriber) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }
    
    try {
      console.log('[WhisperMainThread] Starting transcription');
      onProgress?.({ status: 'processing', progress: 10, message: 'Processing audio...' });
      
      // Convert file to base64 data URL (same as working test page)
      const reader = new FileReader();
      const audioData = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      onProgress?.({ status: 'processing', progress: 50, message: 'Transcribing audio...' });
      
      // Perform transcription with the same options as the working test page
      const result = await this.transcriber(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: options.language || 'english',
        task: options.task || 'transcribe',
        return_timestamps: true,
      });
      
      console.log('[WhisperMainThread] Transcription complete:', result);
      
      // Convert result to our format
      const segments = result.chunks?.map((chunk: any, index: number) => ({
        id: `segment-${index}`,
        text: chunk.text.trim(),
        startTime: chunk.timestamp?.[0] || 0,
        endTime: chunk.timestamp?.[1] || 0,
        words: []
      })) || [];
      
      onProgress?.({
        status: 'complete',
        progress: 100,
        message: 'Transcription complete'
      });
      
      return {
        text: result.text,
        segments,
        language: options.language || 'en'
      };
      
    } catch (error) {
      console.error('[WhisperMainThread] Transcription failed:', error);
      throw error;
    }
  }
  
  async cleanup(): Promise<void> {
    if (this.transcriber) {
      this.transcriber = null;
      this.currentModel = null;
    }
  }
  
  // Additional helper methods
  async downloadModel(modelId: string, progressCallback?: (progress: number, status: string) => void): Promise<void> {
    await this.loadModel(modelId, (progress) => {
      progressCallback?.(progress.progress, progress.message);
    });
  }
  
  isModelLoaded(modelId: string): boolean {
    const modelMap: Record<string, string> = {
      'whisper-tiny': 'Xenova/whisper-tiny',
      'whisper-base': 'Xenova/whisper-base',
      'whisper-small': 'Xenova/whisper-small',
      'whisper-medium': 'Xenova/whisper-medium',
      'whisper-large': 'Xenova/whisper-large-v2',
      'whisper-tiny-en': 'Xenova/whisper-tiny.en',
      'whisper-base-en': 'Xenova/whisper-base.en',
    };
    
    const modelPath = modelMap[modelId] || '';
    return this.currentModel === modelPath;
  }
}

export const whisperMainThreadService = new WhisperMainThreadService(); 