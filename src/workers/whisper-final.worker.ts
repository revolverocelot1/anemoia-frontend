/// <reference lib="webworker" />

import { pipeline, env, AutoModelForSpeechSeq2Seq, AutoProcessor } from '@xenova/transformers';

// Configure environment
env.allowLocalModels = false;
env.allowRemoteModels = true;
// @ts-ignore - remoteURL exists but is not in TypeScript definitions
env.remoteURL = 'https://huggingface.co/';

let processor: any = null;
let model: any = null;
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
    console.log('[WhisperFinal] Progress:', progress);
    
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
    
    console.log('[WhisperFinal] Loading model:', modelPath);
    
    // If same model is already loaded, skip
    if (model && processor && currentModel === modelPath) {
      console.log('[WhisperFinal] Model already loaded');
      self.postMessage({ type: 'model-loaded', success: true });
      return;
    }
    
    // Clear previous model
    model = null;
    processor = null;
    
    // Load processor and model separately to avoid pipeline issues
    console.log('[WhisperFinal] Loading processor...');
    processor = await AutoProcessor.from_pretrained(modelPath, {
      progress_callback: createProgressCallback(modelName)
    });
    
    console.log('[WhisperFinal] Loading model...');
    model = await AutoModelForSpeechSeq2Seq.from_pretrained(modelPath, {
      progress_callback: createProgressCallback(modelName)
    });
    
    currentModel = modelPath;
    console.log('[WhisperFinal] Model loaded successfully');
    
    self.postMessage({ type: 'model-loaded', success: true });
  } catch (error) {
    console.error('[WhisperFinal] Error loading model:', error);
    self.postMessage({ 
      type: 'error', 
      error: error instanceof Error ? error.message : 'Failed to load model' 
    });
  }
}

// Process audio to get features
async function processAudio(audioData: Float32Array, sampleRate: number) {
  if (!processor) {
    throw new Error('Processor not loaded');
  }
  
  // Resample to 16kHz if needed
  let processedAudio = audioData;
  if (sampleRate !== 16000) {
    console.log('[WhisperFinal] Resampling audio from', sampleRate, 'to 16000 Hz');
    // Simple downsampling (not ideal but works for basic use)
    const ratio = sampleRate / 16000;
    const newLength = Math.floor(audioData.length / ratio);
    processedAudio = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      processedAudio[i] = audioData[Math.floor(i * ratio)];
    }
  }
  
  // Process audio
  const inputs = await processor(processedAudio, {
    sampling_rate: 16000,
    return_tensors: 'pt'
  });
  
  return inputs;
}

// Transcribe audio function
async function transcribeAudio(audioData: Float32Array, sampleRate: number): Promise<void> {
  try {
    if (!model || !processor) {
      throw new Error('Model not loaded. Please load a model first.');
    }
    
    console.log('[WhisperFinal] Starting transcription...');
    self.postMessage({
      type: 'progress',
      progress: 5,
      status: 'Processing audio...'
    });
    
    // Process audio
    const inputs = await processAudio(audioData, sampleRate);
    
    self.postMessage({
      type: 'progress',
      progress: 20,
      status: 'Running transcription...'
    });
    
    // Generate transcription
    const output = await model.generate(inputs.input_features, {
      max_new_tokens: 448,
      return_timestamps: true,
    });
    
    self.postMessage({
      type: 'progress',
      progress: 80,
      status: 'Decoding results...'
    });
    
    // Decode the generated tokens
    const transcription = processor.decode(output[0], { 
      skip_special_tokens: true,
      output_offsets: true 
    });
    
    console.log('[WhisperFinal] Transcription result:', transcription);
    
    // Extract segments with timestamps if available
    let segments = [];
    if (transcription.offsets && transcription.offsets.length > 0) {
      segments = transcription.offsets.map((offset: any) => ({
        text: offset.text,
        start: offset.timestamp[0],
        end: offset.timestamp[1]
      })).filter((seg: any) => seg.text && seg.text.trim());
    } else {
      // Fallback: create a single segment
      segments = [{
        text: transcription.text || transcription,
        start: 0,
        end: audioData.length / sampleRate
      }];
    }
    
    self.postMessage({
      type: 'transcription-complete',
      result: {
        text: transcription.text || transcription,
        segments
      }
    });
  } catch (error) {
    console.error('[WhisperFinal] Transcription error:', error);
    self.postMessage({ 
      type: 'error', 
      error: error instanceof Error ? error.message : 'Transcription failed' 
    });
  }
}

// Message handler
self.addEventListener('message', async (event) => {
  const { type, modelName = 'whisper-tiny', audioData, sampleRate } = event.data;
  
  console.log('[WhisperFinal] Received message:', type);
  
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
        console.warn('[WhisperFinal] Unknown message type:', type);
    }
  } catch (error) {
    console.error('[WhisperFinal] Error handling message:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

// Log that worker is ready
console.log('[WhisperFinal] Worker ready'); 