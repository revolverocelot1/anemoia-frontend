/// <reference lib="webworker" />

import { pipeline, env } from '@xenova/transformers';

// Configure environment
env.allowLocalModels = false;
env.allowRemoteModels = true;
// @ts-ignore - remoteURL exists but is not in TypeScript definitions
env.remoteURL = 'https://huggingface.co/';

let transcriber: any = null;
let currentModel = '';

// Model mapping
const WHISPER_MODELS: Record<string, string> = {
  'whisper-tiny': 'Xenova/whisper-tiny',
  'whisper-base': 'Xenova/whisper-base',
  'whisper-small': 'Xenova/whisper-small',
  'whisper-medium': 'Xenova/whisper-medium',
  'whisper-large': 'Xenova/whisper-large-v2',
  'whisper-tiny-en': 'Xenova/whisper-tiny.en',
  'whisper-base-en': 'Xenova/whisper-base.en',
};

// Progress callback helper
function createProgressCallback(modelName: string) {
  return (progress: any) => {
    console.log('[WhisperFixed] Progress:', progress);
    
    if (progress.status === 'progress' && progress.total) {
      const percent = Math.round((progress.loaded / progress.total) * 100);
      self.postMessage({
        type: 'progress',
        progress: Math.max(20, percent),
        status: `Downloading model: ${percent}% (${Math.round(progress.loaded / 1024 / 1024)}MB / ${Math.round(progress.total / 1024 / 1024)}MB)`
      });
    } else if (progress.status === 'download') {
      self.postMessage({
        type: 'progress',
        progress: 10,
        status: 'Downloading model files...'
      });
    } else if (progress.status === 'initiate') {
      self.postMessage({
        type: 'progress',
        progress: 15,
        status: 'Initializing model...'
      });
    } else if (progress.status === 'done') {
      self.postMessage({
        type: 'progress',
        progress: 100,
        status: 'Model loaded successfully!'
      });
    }
  };
}

// Load model function
async function loadModel(modelName: string): Promise<void> {
  try {
    const modelPath = WHISPER_MODELS[modelName] || modelName;
    
    console.log('[WhisperFixed] Loading model:', modelPath);
    
    // If same model is already loaded, skip
    if (transcriber && currentModel === modelPath) {
      console.log('[WhisperFixed] Model already loaded');
      self.postMessage({ type: 'model-loaded', success: true });
      return;
    }
    
    // Create pipeline with progress callback
    transcriber = await pipeline(
      'automatic-speech-recognition',
      modelPath,
      {
        progress_callback: createProgressCallback(modelName)
      }
    );
    
    currentModel = modelPath;
    console.log('[WhisperFixed] Model loaded successfully');
    
    self.postMessage({ type: 'model-loaded', success: true });
  } catch (error) {
    console.error('[WhisperFixed] Error loading model:', error);
    self.postMessage({ 
      type: 'error', 
      error: error instanceof Error ? error.message : 'Failed to load model' 
    });
  }
}

// Transcribe audio function
async function transcribeAudio(audioData: Float32Array, sampleRate: number): Promise<void> {
  try {
    if (!transcriber) {
      throw new Error('Model not loaded. Please load a model first.');
    }
    
    console.log('[WhisperFixed] Starting transcription...');
    self.postMessage({
      type: 'progress',
      progress: 5,
      status: 'Processing audio...'
    });
    
    // Run transcription
    const result = await transcriber(audioData, {
      // Whisper expects 16kHz audio
      sampling_rate: sampleRate || 16000,
      // Return timestamps
      return_timestamps: true,
      // Chunk length in seconds (30s chunks)
      chunk_length_s: 30,
      // Stride length in seconds (5s overlap)
      stride_length_s: 5,
    });
    
    console.log('[WhisperFixed] Transcription result:', result);
    
    // Format result
    const segments = result.chunks?.map((chunk: any) => ({
      text: chunk.text,
      start: chunk.timestamp[0],
      end: chunk.timestamp[1]
    })) || [{
      text: result.text,
      start: 0,
      end: audioData.length / (sampleRate || 16000)
    }];
    
    self.postMessage({
      type: 'transcription-complete',
      result: {
        text: result.text,
        segments
      }
    });
  } catch (error) {
    console.error('[WhisperFixed] Transcription error:', error);
    self.postMessage({ 
      type: 'error', 
      error: error instanceof Error ? error.message : 'Transcription failed' 
    });
  }
}

// Message handler
self.addEventListener('message', async (event) => {
  const { type, modelName = 'whisper-tiny', audioData, sampleRate } = event.data;
  
  console.log('[WhisperFixed] Received message:', type);
  
  try {
    switch (type) {
      case 'initialize':
      case 'load-model':
        await loadModel(modelName);
        break;
        
      case 'transcribe':
        await transcribeAudio(audioData, sampleRate);
        break;
        
      default:
        console.warn('[WhisperFixed] Unknown message type:', type);
    }
  } catch (error) {
    console.error('[WhisperFixed] Error handling message:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Log that worker is ready
console.log('[WhisperFixed] Worker ready'); 