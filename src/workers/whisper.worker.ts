import { pipeline, env } from '@xenova/transformers';
import type { Pipeline } from '@xenova/transformers';

// Configure environment for web worker
env.allowRemoteModels = true;
env.backends.onnx.wasm.numThreads = 1;

interface WorkerMessage {
  type: 'load' | 'transcribe' | 'dispose';
  data?: any;
}

interface WorkerResponse {
  type: 'loaded' | 'progress' | 'result' | 'error' | 'disposed';
  data?: any;
}

let whisperPipeline: Pipeline | null = null;
let currentModel: string | null = null;

// Handle messages from main thread
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type, data } = event.data;
  
  try {
    switch (type) {
      case 'load':
        await loadModel(data.modelPath, data.quantized);
        break;
        
      case 'transcribe':
        await transcribeAudio(data.audio, data.options);
        break;
        
      case 'dispose':
        disposePipeline();
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error) {
    postResponse({
      type: 'error',
      data: {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      }
    });
  }
});

async function loadModel(modelPath: string, quantized: boolean) {
  // Dispose existing pipeline
  if (whisperPipeline) {
    disposePipeline();
  }
  
  // Load new model with progress tracking
  whisperPipeline = await pipeline(
    'automatic-speech-recognition',
    modelPath,
    {
      quantized,
      progress_callback: (progress: any) => {
        postResponse({
          type: 'progress',
          data: {
            status: progress.status || 'loading',
            file: progress.file,
            progress: progress.progress,
            loaded: progress.loaded,
            total: progress.total
          }
        });
      }
    }
  );
  
  currentModel = modelPath;
  
  postResponse({
    type: 'loaded',
    data: { model: modelPath }
  });
}

async function transcribeAudio(audioData: Float32Array, options: any) {
  if (!whisperPipeline) {
    throw new Error('Model not loaded');
  }
  
  // Perform transcription
  const result = await whisperPipeline(audioData, {
    language: options.language,
    task: options.task || 'transcribe',
    return_timestamps: options.return_timestamps !== false,
    chunk_length_s: options.chunk_length_s || 30,
    stride_length_s: options.stride_length_s || 5,
    ...options
  });
  
  // Process result to ensure proper format
  const processedResult = {
    text: result.text,
    chunks: result.chunks || []
  };
  
  // Convert chunk timestamps to seconds if needed
  if (processedResult.chunks && processedResult.chunks.length > 0) {
    processedResult.chunks = processedResult.chunks.map((chunk: any) => ({
      text: chunk.text,
      timestamp: Array.isArray(chunk.timestamp) 
        ? chunk.timestamp 
        : [chunk.start || 0, chunk.end || 0]
    }));
  }
  
  postResponse({
    type: 'result',
    data: processedResult
  });
}

function disposePipeline() {
  if (whisperPipeline) {
    // @ts-ignore - dispose method might not be typed
    whisperPipeline.dispose?.();
    whisperPipeline = null;
    currentModel = null;
  }
  
  postResponse({
    type: 'disposed',
    data: {}
  });
}

function postResponse(response: WorkerResponse) {
  self.postMessage(response);
}

// Export types for use in main thread
export type { WorkerMessage, WorkerResponse }; 