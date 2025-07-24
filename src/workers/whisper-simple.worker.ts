/// <reference lib="webworker" />

import { pipeline } from '@xenova/transformers';

let transcriber: any = null;
let currentModel: string = '';

self.addEventListener('message', async (event) => {
  const { type, modelName = 'whisper-tiny', audioData } = event.data;

  try {
    if (type === 'initialize' || type === 'loadModel') {
      // Model mapping
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
      
      if (currentModel !== modelPath || !transcriber) {
        self.postMessage({
          type: 'progress',
          progress: 10,
          status: `Loading model: ${modelName}`
        });

        // Create pipeline - exactly like the working test page
        transcriber = await pipeline(
          'automatic-speech-recognition',
          modelPath,
          {
            progress_callback: (progress: any) => {
              if (progress.status === 'progress' && progress.total) {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                self.postMessage({
                  type: 'progress',
                  progress: percent,
                  status: `Downloading model: ${percent}%`
                });
              }
            }
          }
        );
        
        currentModel = modelPath;
        
        self.postMessage({
          type: 'modelLoaded',
          status: 'Model loaded successfully'
        });
      }
    }

    if (type === 'transcribe') {
      if (!transcriber) {
        throw new Error('Model not loaded');
      }

      self.postMessage({
        type: 'progress',
        progress: 50,
        status: 'Transcribing audio...'
      });

      // Transcribe with the same options as the working test page
      const result = await transcriber(audioData, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: 'english',
        task: 'transcribe',
        return_timestamps: true,
      });

      self.postMessage({
        type: 'transcriptionComplete',
        result: {
          text: result.text,
          chunks: result.chunks || []
        }
      });
    }
  } catch (error) {
    console.error('[WhisperSimpleWorker] Error:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error)
    });
  }
});

// Export empty object to satisfy module requirements
export {}; 