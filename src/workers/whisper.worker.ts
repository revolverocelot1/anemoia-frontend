/// <reference lib="webworker" />

// Import environment configuration
import { ENV, isProduction } from '../config/environment';

// Initialize variables
let ortLoaded = false;
let ort: any = null;
let ortInitAttempts = 0;
let pipeline: any;
let env: any;
let WhisperForConditionalGeneration: any;
let AutoTokenizer: any;
let AutoProcessor: any;
let transcriber: any = null;
let isModelLoading = false;
let currentModel = '';

// Model configurations - use the same models as the test page that works
const WHISPER_MODELS = {
  'whisper-tiny': 'Xenova/whisper-tiny',
  'whisper-base': 'Xenova/whisper-base', 
  'whisper-small': 'Xenova/whisper-small',
  'whisper-medium': 'Xenova/whisper-medium',
  'whisper-large': 'Xenova/whisper-large-v2',
  // English-only versions
  'whisper-tiny-en': 'Xenova/whisper-tiny.en',
  'whisper-base-en': 'Xenova/whisper-base.en',
} as const;

// Message types
interface LoadModelMessage {
  type: 'load-model';
  model: string;
  options?: {
    cache?: boolean;
    device?: 'webgpu' | 'wasm';
    direct?: boolean;
  };
}

interface TranscribeMessage {
  type: 'transcribe';
  audio: Float32Array;
  options?: {
    language?: string;
    task?: 'transcribe' | 'translate';
    return_timestamps?: boolean | 'word';
    chunk_length_s?: number;
    stride_length_s?: number;
    temperature?: number;
    beam_size?: number;
  };
}

interface ProgressMessage {
  type: 'progress';
  progress: number;
  status: string;
}

interface ResultMessage {
  type: 'result';
  text: string;
  segments: Array<{
    text: string;
    start: number;
    end: number;
    confidence?: number;
    words?: Array<{
      word: string;
      start: number;
      end: number;
      confidence: number;
    }>;
  }>;
  language?: string;
  duration?: number;
}

interface ErrorMessage {
  type: 'error';
  error: string;
  details?: any;
}

type WorkerMessage = LoadModelMessage | TranscribeMessage;
type ResponseMessage = ProgressMessage | ResultMessage | ErrorMessage;

const initializeTransformers = async () => {
  try {
    console.log('[WhisperWorker] Importing @xenova/transformers...');
    const transformers = await import('@xenova/transformers');
    console.log('[WhisperWorker] Transformers.js imported successfully');
    
    pipeline = transformers.pipeline;
    env = transformers.env;
    WhisperForConditionalGeneration = transformers.WhisperForConditionalGeneration;
    AutoTokenizer = transformers.AutoTokenizer;
    AutoProcessor = transformers.AutoProcessor;
    
    console.log('[WhisperWorker] Configuring Transformers.js environment...');
    
    // Configure environment properties directly
    env.allowLocalModels = false;
    env.allowRemoteModels = true;
    env.remoteURL = 'https://huggingface.co/';
    env.useBrowserCache = true;
    
    // Configure ONNX backend settings
    if (env.backends && env.backends.onnx) {
      env.backends.onnx.wasm = {
        proxy: false,
        numThreads: 4,
      };
    }
    
    console.log('[WhisperWorker] Transformers.js environment configured');
    
    // Set local model path if needed
    if (!isProduction) {
      env.localURL = '/models/';
    }
    
    return transformers;
  } catch (error) {
    console.error('[WhisperWorker] Failed to initialize transformers:', error);
    throw error;
  }
};

// Load model with better error handling
const loadModel = async (modelName: string, options?: LoadModelMessage['options']) => {
  if (isModelLoading) {
    throw new Error('Model is already loading');
  }
  
  isModelLoading = true;
  currentModel = modelName;
  
  try {
    self.postMessage({
      type: 'progress',
      progress: 0,
      status: 'Initializing Whisper AI model...'
    } as ProgressMessage);
    
    // Initialize transformers if not already done
    if (!pipeline || !env) {
      console.log('[WhisperWorker] Initializing transformers.js...');
      const initialized = await initializeTransformers();
      if (!initialized) {
        throw new Error('Failed to initialize transformers.js');
      }
    }
    
    // Skip WASM and ONNX Runtime verification - transformers.js will handle everything
    console.log('[WhisperWorker] Skipping ONNX Runtime verification - transformers.js will handle it');
    
    // Get the actual model path
    const modelPath = WHISPER_MODELS[modelName as keyof typeof WHISPER_MODELS] || modelName;
    
    console.log('[WhisperWorker] Loading model:', modelPath);
    
    // Log current environment state
    console.log('[WhisperWorker] Environment state:', {
      ortLoaded,
      backends: env.backends,
      allowRemoteModels: env.allowRemoteModels,
      useBrowserCache: env.useBrowserCache,
      remoteURL: (env as any).remoteURL
    });
    
    let retryCount = 0;
    const maxRetries = 3;
    
    while (retryCount < maxRetries) {
      try {
        self.postMessage({
          type: 'progress',
          progress: 5 + (retryCount * 10),
          status: retryCount > 0 ? `Retrying model load (attempt ${retryCount + 1}/${maxRetries})...` : 'Loading AI model...'
        } as ProgressMessage);
        
        // Progress callback function
        const progressCallback = (progress: any) => {
          console.log('[WhisperWorker] Progress:', progress);
          
          if (progress.status === 'progress' && progress.total) {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            self.postMessage({
              type: 'progress',
              progress: Math.max(20, percent),
              status: `Downloading model: ${percent}% (${Math.round(progress.loaded / 1024 / 1024)}MB / ${Math.round(progress.total / 1024 / 1024)}MB)`
            } as ProgressMessage);
          } else if (progress.status === 'download') {
            self.postMessage({
              type: 'progress', 
              progress: 10,
              status: 'Downloading model files...'
            } as ProgressMessage);
          } else if (progress.status === 'initiate') {
            self.postMessage({
              type: 'progress',
              progress: 15,
              status: 'Initializing model...'
            } as ProgressMessage);
          } else if (progress.status === 'ready') {
            self.postMessage({
              type: 'progress',
              progress: 95,
              status: 'Model ready!'
            } as ProgressMessage);
          } else if (progress.status === 'done') {
            self.postMessage({
              type: 'progress',
              progress: 100,
              status: 'Model loaded successfully!'
            } as ProgressMessage);
          }
        };
        
        // Create pipeline - use the correct approach for different Transformers.js versions
        // Try the standard pipeline creation first
        try {
          transcriber = await pipeline(
            'automatic-speech-recognition',
            modelPath,
            {
              progress_callback: progressCallback,
              // Revision can help with model compatibility
              revision: 'main',
              // Some versions of Transformers.js use different options
              quantized: true,
            }
          );
        } catch (pipelineError: any) {
          // If standard pipeline fails with model type error, try a workaround
          if (pipelineError.message && pipelineError.message.includes('Unsupported model type')) {
            console.log('[WhisperWorker] Standard pipeline failed, trying alternative approach...');
            
            // Try creating the model components manually
            const tokenizer = await AutoTokenizer.from_pretrained(modelPath, {
              progress_callback: progressCallback
            });
            
            const processor = await AutoProcessor.from_pretrained(modelPath, {
              progress_callback: progressCallback
            });
            
            const model = await WhisperForConditionalGeneration.from_pretrained(modelPath, {
              progress_callback: progressCallback,
              quantized: true
            });
            
            // Create a custom transcriber object that mimics the pipeline interface
            transcriber = {
              tokenizer,
              processor,
              model,
              // Add the transcribe method
              async __call__(audio: any, options: any = {}) {
                // Process audio with processor
                const inputs = await processor(audio);
                
                // Generate with model
                const output = await model.generate(inputs.input_features, {
                  ...options,
                  max_new_tokens: options.max_new_tokens || 448,
                  num_beams: options.num_beams || 1,
                  language: options.language,
                  task: options.task || 'transcribe'
                });
                
                // Decode the output
                const decoded = tokenizer.decode(output[0], {
                  skip_special_tokens: true
                });
                
                return {
                  text: decoded
                };
              }
            };
          } else {
            // Re-throw if it's a different error
            throw pipelineError;
          }
        }
        
        // If we get here, model loaded successfully
        break;
        
      } catch (pipelineError: any) {
        console.error(`[WhisperWorker] Pipeline creation failed (attempt ${retryCount + 1}/${maxRetries}):`, pipelineError);
        
        retryCount++;
        
        if (retryCount >= maxRetries) {
          // Check if it's a CORS or network error
          const errorMessage = pipelineError.message || '';
          const errorString = pipelineError.toString();
          
          // More comprehensive error detection
          if (errorMessage.includes('Unexpected token') || 
              errorMessage.includes('DOCTYPE') ||
              errorMessage.includes('Failed to fetch') ||
              errorString.includes('NetworkError') ||
              errorString.includes('CORS')) {
            throw new Error(`Failed to download model. This appears to be a network or CORS issue. 

Possible solutions:
1. Check your internet connection
2. If using a corporate network, try using a VPN
3. Try using a different browser (Chrome/Edge recommended)
4. Clear your browser cache and try again
5. If the issue persists, the Hugging Face servers might be temporarily unavailable`);
          } else if (errorMessage.includes('f is not a function') || errorMessage.includes('backend')) {
            throw new Error(`Model initialization failed. Please try refreshing the page. If the issue persists, try using a different browser (Chrome/Edge recommended).`);
          } else if (errorMessage.includes('404') || errorMessage.includes('Not Found')) {
            throw new Error(`Model "${modelPath}" not found. Please check the model name and try again.`);
          } else {
            throw new Error(`Pipeline creation failed after ${maxRetries} attempts: ${errorMessage}`);
          }
        } else {
          // Wait before retry with exponential backoff
          const waitTime = Math.min(2000 * Math.pow(2, retryCount - 1), 10000);
          console.log(`[WhisperWorker] Retrying in ${waitTime / 1000} seconds...`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
        }
      }
    }
    
    // Verify model loaded correctly
    if (!transcriber) {
      throw new Error('Failed to initialize model pipeline');
    }
    
    self.postMessage({
      type: 'progress',
      progress: 100,
      status: 'Whisper AI model loaded successfully!'
    } as ProgressMessage);
    
    console.log('[WhisperWorker] Model loaded successfully');
    
  } catch (error: any) {
    console.error('[WhisperWorker] Model loading failed:', error);
    
    // Provide detailed error information
    const errorDetails = {
      message: error.message,
      stack: error.stack,
      ortLoaded,
      backends: env?.backends,
      environment: {
        origin: self.location.origin,
        wasmPaths: (env?.backends?.onnx?.wasm as any)?.wasmPaths,
        remoteURL: (env as any)?.remoteURL
      }
    };
    
    self.postMessage({
      type: 'error',
      error: `Failed to load Whisper model: ${error.message}`,
      details: errorDetails
    } as ErrorMessage);
    
    // Reset state
    transcriber = null;
    currentModel = '';
    throw error;
    
  } finally {
    isModelLoading = false;
  }
};

// Real transcription implementation - NO FALLBACK
const transcribeAudio = async (audio: Float32Array, options?: TranscribeMessage['options']) => {
  if (!transcriber) {
    throw new Error('Model not loaded. Please load a model first.');
  }
  
  const startTime = Date.now();
  
  try {
    self.postMessage({
      type: 'progress',
      progress: 10,
      status: 'Preparing audio for transcription...'
    } as ProgressMessage);
    
    console.log('[WhisperWorker] Starting transcription with options:', {
      audioLength: audio.length,
      sampleRate: 16000,
      duration: audio.length / 16000,
      ...options
    });
    
    // Add timeout for transcription
    const transcriptionTimeout = setTimeout(() => {
      const errorMsg = 'Transcription timeout - this may happen with very long audio or slow devices';
      console.error('[WhisperWorker]', errorMsg);
      self.postMessage({
        type: 'error',
        error: errorMsg,
        details: { timeout: true, duration: audio.length / 16000 }
      } as ErrorMessage);
    }, 300000); // 5 minute timeout
    
    try {
    // Real transcription with Whisper
    const result = await transcriber(audio, {
      return_timestamps: true,
      chunk_length_s: options?.chunk_length_s || 30,
      stride_length_s: options?.stride_length_s || 5,
      language: options?.language,
      task: options?.task || 'transcribe',
      // Additional options for better accuracy
      suppress_tokens: [],
        forced_decoder_ids: options?.language ? [[1, transcriber.tokenizer.lang_to_id(options.language)]] : undefined,
        // Add progress callback for transcription
        progress_callback: (progress: any) => {
          console.log('[WhisperWorker] Transcription progress:', progress);
          if (progress && typeof progress === 'object') {
            // Send progress updates during transcription
            self.postMessage({
              type: 'progress',
              progress: Math.min(80, 10 + (progress.progress || 0) * 70),
              status: `Transcribing audio... ${Math.round((progress.progress || 0) * 100)}%`
            } as ProgressMessage);
          }
        }
      });
      
      clearTimeout(transcriptionTimeout); // Clear timeout on successful transcription
    
    self.postMessage({
      type: 'progress',
      progress: 90,
      status: 'Processing transcription results...'
    } as ProgressMessage);
    
    // Process chunks into segments
    const segments: ResultMessage['segments'] = [];
    
    if (result.chunks && result.chunks.length > 0) {
      console.log('[WhisperWorker] Processing', result.chunks.length, 'chunks');
      
      result.chunks.forEach((chunk: any, index: number) => {
        // Ensure valid timestamps
        const startTime = chunk.timestamp?.[0] ?? (index * 2);
        const endTime = chunk.timestamp?.[1] ?? (startTime + 2);
        
        segments.push({
          text: chunk.text.trim(),
          start: Math.max(0, startTime),
          end: Math.max(startTime + 0.5, endTime),
          confidence: 0.95
        });
      });
    } else if (result.text) {
      // If no chunks but we have text, create segments based on sentence boundaries
      console.log('[WhisperWorker] No chunks found, creating segments from text');
      
      const sentences = result.text.match(/[^.!?]+[.!?]+/g) || [result.text];
      const audioDuration = audio.length / 16000;
      const timePerSentence = audioDuration / sentences.length;
      
      sentences.forEach((sentence: string, index: number) => {
        segments.push({
          text: sentence.trim(),
          start: index * timePerSentence,
          end: (index + 1) * timePerSentence,
          confidence: 0.8
        });
      });
    } else {
      throw new Error('No transcription result returned from model');
    }
    
    const totalDuration = (Date.now() - startTime) / 1000;
    
    console.log('[WhisperWorker] Transcription complete:', {
      segments: segments.length,
      duration: totalDuration,
      text: result.text?.substring(0, 100) + '...'
    });
    
    self.postMessage({
      type: 'progress',
      progress: 100,
      status: 'Transcription complete!'
    } as ProgressMessage);
    
    self.postMessage({
      type: 'result',
      text: result.text || segments.map(s => s.text).join(' '),
      segments,
      language: result.language || options?.language || 'en',
      duration: totalDuration
    } as ResultMessage);
    
    } catch (error) {
      clearTimeout(transcriptionTimeout); // Clear timeout on transcription error
      console.error('[WhisperWorker] Transcription error:', error);
      
      // Send proper error message - NO FALLBACK
      const errorMessage = error instanceof Error ? error.message : 'Unknown transcription error';
      
      self.postMessage({
        type: 'error',
        error: `Transcription failed: ${errorMessage}. Please ensure the audio is valid and the model is properly loaded.`,
        details: error
      } as ErrorMessage);
      
      throw error;
    }
  } catch (error) {
    console.error('[WhisperWorker] Transcription error:', error);
    
    // Send proper error message - NO FALLBACK
    const errorMessage = error instanceof Error ? error.message : 'Unknown transcription error';
    
    self.postMessage({
      type: 'error',
      error: `Transcription failed: ${errorMessage}. Please ensure the audio is valid and the model is properly loaded.`,
      details: error
    } as ErrorMessage);
    
    throw error;
  }
};

// Initialize ONNX Runtime with retries
const initializeORT = async () => {
  const maxAttempts = ENV.MODEL_LOADING.MAX_RETRIES;
  
  while (ortInitAttempts < maxAttempts && !ortLoaded) {
    ortInitAttempts++;
    
    try {
      console.log(`[WhisperWorker] Attempting to load ONNX Runtime (attempt ${ortInitAttempts}/${maxAttempts})...`);
      
      // Dynamic import with timeout
      const ortModule = await Promise.race([
        import('onnxruntime-web'),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('ONNX Runtime import timeout')), 30000)
        )
      ]);
      
      ort = ortModule;
      
      // Configure ONNX Runtime
      if (ort && ort.env) {
        console.log('[WhisperWorker] Configuring ONNX Runtime...');
        
        // Set WASM paths
        ort.env.wasm = ort.env.wasm || {};
        ort.env.wasm.wasmPaths = ENV.ORT_WASM_PATHS;
        ort.env.wasm.numThreads = navigator.hardwareConcurrency || 4;
        ort.env.wasm.simd = true;
        
        // Enable debug logging in development
        if (!isProduction) {
          ort.env.logLevel = 'verbose';
          ort.env.debug = true;
        }
        
        // Test ONNX Runtime
        console.log('[WhisperWorker] Testing ONNX Runtime...');
        await testORTFunctionality();
        
        ortLoaded = true;
        console.log('[WhisperWorker] ONNX Runtime loaded successfully');
      } else {
        throw new Error('ONNX Runtime module loaded but missing expected properties');
      }
    } catch (error) {
      console.error(`[WhisperWorker] ONNX Runtime initialization failed (attempt ${ortInitAttempts}/${maxAttempts}):`, error);
      
      if (ortInitAttempts < maxAttempts) {
        console.log(`[WhisperWorker] Retrying in ${ENV.MODEL_LOADING.RETRY_DELAY}ms...`);
        await new Promise(resolve => setTimeout(resolve, ENV.MODEL_LOADING.RETRY_DELAY));
      } else {
        throw error;
      }
    }
  }
};

// Test ONNX Runtime functionality
const testORTFunctionality = async () => {
  try {
    // Create a minimal test tensor
    const testData = new Float32Array([1, 2, 3, 4]);
    const testTensor = new ort.Tensor('float32', testData, [2, 2]);
    
    if (!testTensor) {
      throw new Error('Failed to create test tensor');
    }
    
    console.log('[WhisperWorker] ONNX Runtime tensor creation test passed');
    
    // Verify WASM backend is available
    const providers = ort.env.wasm ? ['wasm'] : [];
    if (providers.length === 0) {
      throw new Error('No execution providers available');
    }
    
    console.log('[WhisperWorker] Available execution providers:', providers);
  } catch (error) {
    throw new Error(`ONNX Runtime functionality test failed: ${error instanceof Error ? error.message : String(error)}`);
  }
};

// Initialize on startup
console.log('[WhisperWorker] Worker started and ready to receive messages');

// Handle messages - Set this up immediately
self.addEventListener('message', async (event: MessageEvent<WorkerMessage>) => {
  const { type } = event.data;
  
  console.log('[WhisperWorker] Received message:', type, {
    isModelLoading,
    hasTranscriber: !!transcriber,
    currentModel
  });
  
  try {
    switch (type) {
      case 'load-model':
        await loadModel(event.data.model, event.data.options);
        break;
        
      case 'transcribe':
        // Check if model is still loading
        if (isModelLoading) {
          throw new Error('Model is still loading. Please wait for it to complete.');
        }
        
        // Log the current state
        console.log('[WhisperWorker] Transcribe request:', {
          hasTranscriber: !!transcriber,
          currentModel,
          audioLength: event.data.audio?.length
        });
        
        await transcribeAudio(event.data.audio, event.data.options);
        break;
        
      default:
        self.postMessage({
          type: 'error',
          error: `Unknown message type: ${type}`
        } as ErrorMessage);
    }
  } catch (error) {
    console.error('[WhisperWorker] Error handling message:', error);
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      details: error
    } as ErrorMessage);
  }
});

// Export types for use in main thread
export type { LoadModelMessage, TranscribeMessage, ProgressMessage, ResultMessage, ErrorMessage }; 