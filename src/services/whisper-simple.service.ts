import type { TranscriptionOptions, TranscriptionResult } from '../types/subtitle';

interface TranscriptionProgress {
  status: 'loading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

class WhisperSimpleService {
  private worker: Worker | null = null;
  private currentModel: string | null = null;
  private transcriptionInProgress = false;
  
  async loadModel(modelName: string = 'whisper-tiny', onProgress?: (progress: TranscriptionProgress) => void): Promise<void> {
    try {
      // Create worker if not exists
      if (!this.worker) {
        this.worker = new Worker(
          new URL('../workers/whisper-simple.worker.ts', import.meta.url),
          { type: 'module' }
        );
        
        // Set up message handler
        this.worker.onmessage = (event) => {
          const { type, progress, status, error } = event.data;
          
          if (type === 'progress' && onProgress) {
            onProgress({
              status: 'loading',
              progress,
              message: status
            });
          } else if (type === 'error') {
            console.error('[WhisperSimple] Worker error:', error);
          }
        };
      }
      
      // Send load model message
      this.worker.postMessage({
        type: 'loadModel',
        modelName
      });
      
      // Wait for model to load
      await new Promise<void>((resolve, reject) => {
        const handler = (event: MessageEvent) => {
          if (event.data.type === 'modelLoaded') {
            this.worker!.removeEventListener('message', handler);
            this.currentModel = modelName;
            resolve();
          } else if (event.data.type === 'error') {
            this.worker!.removeEventListener('message', handler);
            reject(new Error(event.data.error));
          }
        };
        this.worker!.addEventListener('message', handler);
      });
      
    } catch (error) {
      console.error('[WhisperSimple] Failed to load model:', error);
      throw error;
    }
  }
  
  async transcribe(
    file: File | Blob,
    options: Partial<TranscriptionOptions> = {},
    onProgress?: (progress: TranscriptionProgress) => void
  ): Promise<TranscriptionResult> {
    if (!this.worker || !this.currentModel) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }
    
    if (this.transcriptionInProgress) {
      throw new Error('Transcription already in progress');
    }
    
    this.transcriptionInProgress = true;
    
    try {
      // Convert file to base64 data URL (same as working test page)
      const reader = new FileReader();
      const audioData = await new Promise<string>((resolve, reject) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      
      // Send transcribe message
      this.worker.postMessage({
        type: 'transcribe',
        audioData
      });
      
      // Wait for transcription result
      const result = await new Promise<TranscriptionResult>((resolve, reject) => {
        const handler = (event: MessageEvent) => {
          const { type, progress, status, result, error } = event.data;
          
          if (type === 'progress' && onProgress) {
            onProgress({
              status: 'processing',
              progress,
              message: status
            });
          } else if (type === 'transcriptionComplete') {
            this.worker!.removeEventListener('message', handler);
            
            // Convert chunks to our format
            const segments = result.chunks?.map((chunk: any, index: number) => ({
              id: `segment-${index}`,
              text: chunk.text.trim(),
              startTime: chunk.timestamp?.[0] || 0,
              endTime: chunk.timestamp?.[1] || 0,
              words: []
            })) || [];
            
            resolve({
              text: result.text,
              segments,
              language: options.language || 'en'
            });
          } else if (type === 'error') {
            this.worker!.removeEventListener('message', handler);
            reject(new Error(error));
          }
        };
        this.worker!.addEventListener('message', handler);
      });
      
      onProgress?.({
        status: 'complete',
        progress: 100,
        message: 'Transcription complete'
      });
      
      return result;
      
    } finally {
      this.transcriptionInProgress = false;
    }
  }
  
  async cleanup(): Promise<void> {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.currentModel = null;
  }
}

export const whisperSimpleService = new WhisperSimpleService(); 