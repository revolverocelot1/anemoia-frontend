import { pipeline, env } from '@xenova/transformers';
import type { TranscriptionOptions, TranscriptionResult } from '../types/subtitle';

// Configure environment
env.allowLocalModels = false;
// @ts-ignore - remoteURL exists but is not in TypeScript definitions
env.remoteURL = 'https://huggingface.co/';

interface TranscriptionProgress {
  status: 'loading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

class WhisperDirectService {
  private pipeline: any = null;
  private currentModel: string | null = null;
  
  async loadModel(modelName: string = 'whisper-tiny', onProgress?: (progress: TranscriptionProgress) => void): Promise<void> {
    try {
      if (this.pipeline && this.currentModel === modelName) {
        console.log('[WhisperDirect] Model already loaded:', modelName);
        return;
      }
      
      console.log('[WhisperDirect] Loading model:', modelName);
      onProgress?.({ status: 'loading', progress: 0, message: 'Initializing Whisper AI model...' });
      
      // Model mapping
      const modelMap: Record<string, string> = {
        'whisper-tiny': 'Xenova/whisper-tiny',
        'whisper-base': 'Xenova/whisper-base',
        'whisper-small': 'Xenova/whisper-small',
        'whisper-medium': 'Xenova/whisper-medium',
        'whisper-large': 'Xenova/whisper-large-v2',
        'whisper-tiny-en': 'Xenova/whisper-tiny.en',
        'whisper-base-en': 'Xenova/whisper-base.en',
        'whisper-small-en': 'Xenova/whisper-small.en',
      };
      
      const modelId = modelMap[modelName] || modelName;
      
      // Create pipeline - simple approach like the working test page
      this.pipeline = await pipeline(
        'automatic-speech-recognition',
        modelId,
        {
          progress_callback: (progress: any) => {
            console.log('[WhisperDirect] Progress:', progress);
            
            if (progress.status === 'progress' && progress.total) {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              onProgress?.({
                status: 'loading',
                progress: percent,
                message: `Downloading model: ${percent}% (${Math.round(progress.loaded / 1024 / 1024)}MB / ${Math.round(progress.total / 1024 / 1024)}MB)`
              });
            } else if (progress.status === 'done') {
              onProgress?.({
                status: 'loading',
                progress: 100,
                message: 'Model loaded successfully!'
              });
            }
          }
        }
      );
      
      this.currentModel = modelName;
      console.log('[WhisperDirect] Model loaded successfully');
      
    } catch (error) {
      console.error('[WhisperDirect] Failed to load model:', error);
      onProgress?.({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Failed to load model'
      });
      throw error;
    }
  }
  
  async transcribe(
    audioData: Float32Array | string,
    options?: TranscriptionOptions,
    onProgress?: (progress: TranscriptionProgress) => void
  ): Promise<TranscriptionResult> {
    try {
      if (!this.pipeline) {
        throw new Error('Model not loaded. Call loadModel() first.');
      }
      
      onProgress?.({ status: 'processing', progress: 0, message: 'Processing audio...' });
      
      // Convert Float32Array to base64 if needed
      let inputData = audioData;
      if (audioData instanceof Float32Array) {
        // Convert to WAV format
        const wav = this.float32ArrayToWav(audioData);
        const blob = new Blob([wav], { type: 'audio/wav' });
        inputData = await this.blobToBase64(blob);
      }
      
      // Transcribe with options similar to the test page
      const result = await this.pipeline(inputData, {
        chunk_length_s: options?.chunk_length_s || 30,
        stride_length_s: options?.stride_length_s || 5,
        language: options?.language || 'english',
        task: options?.task || 'transcribe',
        return_timestamps: options?.return_timestamps !== false,
      });
      
      onProgress?.({ status: 'complete', progress: 100, message: 'Transcription complete!' });
      
      // Format result
      const segments = result.chunks?.map((chunk: any) => ({
        text: chunk.text.trim(),
        start: chunk.timestamp[0],
        end: chunk.timestamp[1],
      })) || [];
      
      return {
        text: result.text,
        segments,
        language: options?.language || 'en'
      };
      
    } catch (error) {
      console.error('[WhisperDirect] Transcription failed:', error);
      onProgress?.({
        status: 'error',
        progress: 0,
        message: error instanceof Error ? error.message : 'Transcription failed'
      });
      throw error;
    }
  }
  
  private float32ArrayToWav(float32Array: Float32Array): ArrayBuffer {
    const length = float32Array.length;
    const buffer = new ArrayBuffer(44 + length * 2);
    const view = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, 1, true);
    view.setUint32(24, 16000, true);
    view.setUint32(28, 32000, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * 2, true);
    
    // Convert float32 to int16
    let offset = 44;
    for (let i = 0; i < length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, float32Array[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
    
    return buffer;
  }
  
  private async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.readAsDataURL(blob);
    });
  }
  
  unload(): void {
    this.pipeline = null;
    this.currentModel = null;
  }
}

export const whisperDirectService = new WhisperDirectService(); 