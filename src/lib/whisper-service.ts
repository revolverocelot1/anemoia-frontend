import { pipeline, env } from '@xenova/transformers';
import type { Pipeline } from '@xenova/transformers';
import { WHISPER_MODELS } from '../config/whisper-models';

// Configure environment
env.allowRemoteModels = true;
env.backends.onnx.wasm.numThreads = 1;

interface TranscriptionResult {
  text: string;
  chunks?: Array<{
    text: string;
    timestamp: [number, number];
  }>;
}

interface ProgressCallback {
  (progress: {
    status: string;
    file?: string;
    progress?: number;
    loaded?: number;
    total?: number;
  }): void;
}

class WhisperService {
  private pipeline: Pipeline | null = null;
  private currentModel: string | null = null;
  private isLoading = false;
  private loadingProgress: ProgressCallback | null = null;

  async loadModel(modelId: string, progressCallback?: ProgressCallback): Promise<void> {
    if (this.isLoading) {
      throw new Error('Model is already loading');
    }

    if (this.currentModel === modelId && this.pipeline) {
      return; // Model already loaded
    }

    this.isLoading = true;
    this.loadingProgress = progressCallback || null;

    try {
      const model = WHISPER_MODELS.find(m => m.id === modelId);
      if (!model) {
        throw new Error(`Model ${modelId} not found`);
      }

      // Dispose of previous pipeline
      if (this.pipeline) {
        // @ts-ignore - dispose method might not be typed
        this.pipeline.dispose?.();
        this.pipeline = null;
      }

      // Load the model with progress tracking
      this.pipeline = await pipeline(
        'automatic-speech-recognition',
        model.modelPath,
        {
          quantized: model.quantized,
          progress_callback: (progress: any) => {
            if (this.loadingProgress) {
              this.loadingProgress({
                status: progress.status || 'loading',
                file: progress.file,
                progress: progress.progress,
                loaded: progress.loaded,
                total: progress.total
              });
            }
          },
          // device: 'webgpu' in navigator ? 'webgpu' : 'wasm',
        }
      );

      this.currentModel = modelId;
    } finally {
      this.isLoading = false;
      this.loadingProgress = null;
    }
  }

  async transcribe(
    audioData: Float32Array | ArrayBuffer,
    options: {
      language?: string;
      task?: 'transcribe' | 'translate';
      return_timestamps?: boolean | 'word';
      chunk_length_s?: number;
    } = {}
  ): Promise<TranscriptionResult> {
    if (!this.pipeline) {
      throw new Error('Model not loaded. Call loadModel() first.');
    }

    const result = await this.pipeline(audioData, {
      language: options.language,
      task: options.task || 'transcribe',
      return_timestamps: options.return_timestamps !== false,
      chunk_length_s: options.chunk_length_s || 30,
    });

    return result as TranscriptionResult;
  }

  async transcribeWithChunks(
    audioData: Float32Array | ArrayBuffer,
    options: {
      language?: string;
      task?: 'transcribe' | 'translate';
    } = {}
  ): Promise<TranscriptionResult> {
    return this.transcribe(audioData, {
      ...options,
      return_timestamps: 'word'
    });
  }

  getLoadedModel(): string | null {
    return this.currentModel;
  }

  isModelLoaded(): boolean {
    return this.pipeline !== null;
  }

  dispose(): void {
    if (this.pipeline) {
      // @ts-ignore
      this.pipeline.dispose?.();
      this.pipeline = null;
      this.currentModel = null;
    }
  }
}

// Export singleton instance
export const whisperService = new WhisperService();

// Export types
export type { TranscriptionResult, ProgressCallback }; 