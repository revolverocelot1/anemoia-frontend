/**
 * Whisper Model Loader
 * Manages preloading and caching of Whisper models
 */

interface WhisperWorkerInstance {
  worker: Worker;
  isReady: boolean;
  modelLoaded: string | null;
  listeners: Set<(event: MessageEvent) => void>;
}

class WhisperModelLoader {
  private static instance: WhisperModelLoader;
  private workerInstance: WhisperWorkerInstance | null = null;
  private preloadPromise: Promise<void> | null = null;
  private currentLoadingModel: string | null = null;

  private constructor() {}

  static getInstance(): WhisperModelLoader {
    if (!WhisperModelLoader.instance) {
      WhisperModelLoader.instance = new WhisperModelLoader();
    }
    return WhisperModelLoader.instance;
  }

  /**
   * Preload the default model (whisper-base)
   */
  async preloadDefaultModel(): Promise<void> {
    if (this.preloadPromise) {
      return this.preloadPromise;
    }

    this.preloadPromise = this.loadModel('whisper-base').catch(err => {
      console.warn('[WhisperLoader] Failed to preload default model:', err);
      this.preloadPromise = null;
      throw err;
    });
    
    return this.preloadPromise;
  }

  /**
   * Load a specific model
   */
  async loadModel(modelName: string): Promise<void> {
    console.log('[WhisperLoader] Loading model:', modelName);
    
    // If same model is already loaded and ready, return
    if (this.workerInstance?.modelLoaded === modelName && this.workerInstance.isReady) {
      console.log('[WhisperLoader] Model already loaded:', modelName);
      return;
    }
    
    // If currently loading this model, wait for it
    if (this.currentLoadingModel === modelName && this.preloadPromise) {
      console.log('[WhisperLoader] Model is already being loaded, waiting...');
      return this.preloadPromise;
    }
    
    // Reset state if loading a different model
    if (this.workerInstance && this.workerInstance.modelLoaded !== modelName) {
      console.log('[WhisperLoader] Resetting worker for new model');
      this.workerInstance.worker.terminate();
      this.workerInstance = null;
    }
    
    // Create worker if not exists
    if (!this.workerInstance) {
      console.log('[WhisperLoader] Creating new worker instance');
      this.workerInstance = {
        worker: new Worker(
          new URL('../workers/whisper.worker.ts', import.meta.url),
          { type: 'module' }
        ),
        isReady: false,
        modelLoaded: null,
        listeners: new Set()
      };
    }

    this.currentLoadingModel = modelName;
    this.workerInstance.isReady = false;

    // Wait a bit to ensure worker is fully initialized
    await new Promise(resolve => setTimeout(resolve, 500));

    return new Promise((resolve, reject) => {
      // Increase timeout to 5 minutes for larger models
      const timeout = setTimeout(() => {
        this.currentLoadingModel = null;
        reject(new Error(`Model loading timeout for ${modelName}. This might happen with larger models or slower connections. Please try again.`));
      }, 300000); // 5 minute timeout

      const handleMessage = (event: MessageEvent) => {
        const { type, progress, status, error, details } = event.data;
        
        console.log(`[WhisperLoader] Message from worker:`, { type, progress, status });
        
        // Forward the message to all listeners
        if (this.workerInstance) {
          this.workerInstance.listeners.forEach(listener => {
            try {
              listener(event);
            } catch (err) {
              console.error('[WhisperLoader] Error in listener:', err);
            }
          });
        }
        
        if (type === 'progress') {
          console.log(`[WhisperLoader] ${status} (${progress}%)`);
          
          if (progress === 100 && status.toLowerCase().includes('successfully')) {
            clearTimeout(timeout);
            if (this.workerInstance) {
              this.workerInstance.isReady = true;
              this.workerInstance.modelLoaded = modelName;
              this.currentLoadingModel = null;
            }
            console.log('[WhisperLoader] Model loading complete');
            resolve();
          }
        } else if (type === 'error') {
          clearTimeout(timeout);
          this.currentLoadingModel = null;
          if (this.workerInstance) {
            this.workerInstance.isReady = false;
            this.workerInstance.modelLoaded = null;
          }
          console.error('[WhisperLoader] Model loading error:', error);
          console.error('[WhisperLoader] Error details:', details);
          reject(new Error(error || 'Unknown error occurred while loading model'));
        }
      };

      if (!this.workerInstance) {
        reject(new Error('Worker instance not available'));
        return;
      }

      // Remove old listeners and add new one
      this.workerInstance.worker.removeEventListener('message', handleMessage);
      this.workerInstance.worker.addEventListener('message', handleMessage);
      
      // Send load model message
      console.log('[WhisperLoader] Sending load-model message to worker');
      this.workerInstance.worker.postMessage({
        type: 'load-model',
        model: modelName,
        options: {
          cache: true,
          device: 'wasm' // Use WASM by default for compatibility
        }
      });
    });
  }

  /**
   * Add a message listener to the worker
   */
  addMessageListener(listener: (event: MessageEvent) => void): void {
    if (this.workerInstance) {
      this.workerInstance.listeners.add(listener);
      this.workerInstance.worker.addEventListener('message', listener);
    }
  }

  /**
   * Remove a message listener from the worker
   */
  removeMessageListener(listener: (event: MessageEvent) => void): void {
    if (this.workerInstance) {
      this.workerInstance.listeners.delete(listener);
      this.workerInstance.worker.removeEventListener('message', listener);
    }
  }

  /**
   * Transcribe audio using the loaded model
   */
  transcribe(audioData: Float32Array, options: {
    language?: string;
    task?: 'transcribe' | 'translate';
    return_timestamps?: boolean;
    chunk_length_s?: number;
    stride_length_s?: number;
  }): void {
    if (!this.workerInstance) {
      throw new Error('Worker not initialized. Please load a model first.');
    }
    
    if (!this.workerInstance.isReady || !this.workerInstance.modelLoaded) {
      throw new Error(`Model not ready. Current state: isReady=${this.workerInstance.isReady}, modelLoaded=${this.workerInstance.modelLoaded}`);
    }

    console.log('[WhisperLoader] Sending transcribe message to worker');
    this.workerInstance.worker.postMessage({
      type: 'transcribe',
      audio: audioData,
      options
    });
  }

  /**
   * Cancel ongoing transcription
   */
  cancelTranscription(): void {
    if (this.workerInstance) {
      console.log('[WhisperLoader] Cancelling transcription');
      
      // Save listeners before terminating
      const listeners = new Set(this.workerInstance.listeners);
      
      // Terminate current worker
      this.workerInstance.worker.terminate();
      
      // Create new worker instance
      const modelToReload = this.workerInstance.modelLoaded;
      this.workerInstance = {
        worker: new Worker(
          new URL('../workers/whisper.worker.ts', import.meta.url),
          { type: 'module' }
        ),
        isReady: false,
        modelLoaded: null,
        listeners: listeners
      };
      
      // Re-add listeners to new worker
      listeners.forEach(listener => {
        this.workerInstance!.worker.addEventListener('message', listener);
      });
      
      this.currentLoadingModel = null;
      
      // Reload the model if one was loaded
      if (modelToReload) {
        console.log('[WhisperLoader] Reloading model after cancellation:', modelToReload);
        this.loadModel(modelToReload).catch(err => {
          console.error('[WhisperLoader] Failed to reload model after cancellation:', err);
        });
      }
    }
  }

  /**
   * Get the current worker instance
   */
  getWorker(): Worker | null {
    return this.workerInstance?.worker || null;
  }

  /**
   * Check if a model is loaded
   */
  isModelLoaded(modelName?: string): boolean {
    if (!this.workerInstance) return false;
    
    if (modelName) {
      return this.workerInstance.modelLoaded === modelName && this.workerInstance.isReady;
    }
    
    return this.workerInstance.isReady && this.workerInstance.modelLoaded !== null;
  }

  /**
   * Get the currently loaded model name
   */
  getLoadedModel(): string | null {
    return this.workerInstance?.modelLoaded || null;
  }

  /**
   * Dispose of the worker
   */
  dispose(): void {
    if (this.workerInstance) {
      this.workerInstance.worker.terminate();
      this.workerInstance = null;
    }
    this.preloadPromise = null;
    this.currentLoadingModel = null;
  }
}

// Export singleton instance
export const whisperLoader = WhisperModelLoader.getInstance();

// Auto-preload on module import if in browser environment
if (typeof window !== 'undefined') {
  // Preload after a short delay to not block initial page load
  setTimeout(() => {
    whisperLoader.preloadDefaultModel().catch(err => {
      console.warn('[WhisperLoader] Failed to preload default model:', err);
    });
  }, 2000);
} 