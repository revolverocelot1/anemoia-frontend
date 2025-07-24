import { pipeline, env } from '@xenova/transformers';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { TranscriptionOptions, TranscriptionResult } from '../types/subtitle';

// Configure environment - simple setup like the working test page
env.allowLocalModels = false;
// @ts-ignore - remoteURL exists but is not in TypeScript definitions
env.remoteURL = 'https://huggingface.co/';

interface TranscriptionProgress {
  status: 'loading' | 'processing' | 'complete' | 'error';
  progress: number;
  message: string;
}

class WhisperTransformersService {
  private pipeline: any = null;
  private ffmpeg: FFmpeg | null = null;
  private currentModel: string | null = null;
  private audioContext: AudioContext | null = null;

  constructor() {
    this.initAudioContext();
  }

  private initAudioContext() {
    if (typeof window !== 'undefined' && 'AudioContext' in window) {
      this.audioContext = new AudioContext({ sampleRate: 16000 });
    }
  }

  async transcribe(
    audioData: ArrayBuffer | Blob | File,
    options: TranscriptionOptions,
    onProgress?: (progress: TranscriptionProgress) => void
  ): Promise<TranscriptionResult> {
    try {
      onProgress?.({ status: 'loading', progress: 0, message: 'Initializing model...' });

      // Map model names to Xenova models (same as working test page)
      const modelMap: { [key: string]: string } = {
        'whisper-tiny': 'Xenova/whisper-tiny',
        'whisper-base': 'Xenova/whisper-base',
        'whisper-small': 'Xenova/whisper-small'
      };

      const modelName = modelMap[options.model || 'whisper-base'] || 'Xenova/whisper-base';

      // Create or reuse pipeline
      if (!this.pipeline || this.currentModel !== modelName) {
        console.log('[WhisperTransformers] Creating pipeline for model:', modelName);
        this.pipeline = await pipeline('automatic-speech-recognition', modelName, {
          progress_callback: (progress: any) => {
            if (progress.status === 'progress') {
              const percent = Math.round((progress.loaded / progress.total) * 100);
              onProgress?.({ 
                status: 'loading', 
                progress: percent * 0.5, // 0-50% for model loading
                message: `Loading model: ${percent}%` 
              });
            }
          }
        });
        this.currentModel = modelName;
      }

      onProgress?.({ status: 'processing', progress: 50, message: 'Processing audio...' });

      // Extract audio if needed
      let processedAudio: Blob;
      if (audioData instanceof File && audioData.type.startsWith('video/')) {
        processedAudio = await this.extractAudioFromVideo(audioData, onProgress);
      } else if (audioData instanceof ArrayBuffer) {
        // Create a WAV blob from ArrayBuffer
        processedAudio = await this.createWavBlob(audioData);
      } else {
        processedAudio = audioData as Blob;
      }

      // Convert audio to base64 data URL (like the test page)
      const reader = new FileReader();
      const audioDataUrl = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(processedAudio);
      });

      onProgress?.({ status: 'processing', progress: 70, message: 'Transcribing audio...' });

      // Perform transcription with the same options as the working test page
      const result = await this.pipeline(audioDataUrl, {
        chunk_length_s: 30,
        stride_length_s: 5,
        language: options.language || 'english',
        task: options.task || 'transcribe',
        return_timestamps: true
      });

      onProgress?.({ status: 'complete', progress: 100, message: 'Transcription complete!' });

      // Convert to our result format
      const segments = result.chunks?.map((chunk: any, index: number) => ({
        id: `segment-${index}`,
        start: chunk.timestamp?.[0] || 0,
        end: chunk.timestamp?.[1] || 0,
        text: chunk.text?.trim() || ''
      })) || [];

      return {
        text: result.text || '',
        segments,
        language: options.language || 'en'
      };

    } catch (error) {
      console.error('[WhisperTransformers] Transcription error:', error);
      onProgress?.({ 
        status: 'error', 
        progress: 0, 
        message: error instanceof Error ? error.message : 'Transcription failed' 
      });
      throw error;
    }
  }

  private async createWavBlob(audioData: ArrayBuffer): Promise<Blob> {
    // If audioData is already a WAV file, return it as is
    const view = new DataView(audioData);
    if (view.byteLength > 4) {
      const riff = String.fromCharCode(view.getUint8(0), view.getUint8(1), view.getUint8(2), view.getUint8(3));
      if (riff === 'RIFF') {
        return new Blob([audioData], { type: 'audio/wav' });
      }
    }

    // Otherwise, assume it's raw PCM data and create a simple WAV header
    const sampleRate = 16000;
    const numChannels = 1;
    const bitsPerSample = 16;
    const dataLength = audioData.byteLength;
    
    const buffer = new ArrayBuffer(44 + dataLength);
    const view2 = new DataView(buffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view2.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view2.setUint32(4, 36 + dataLength, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view2.setUint32(16, 16, true);
    view2.setUint16(20, 1, true);
    view2.setUint16(22, numChannels, true);
    view2.setUint32(24, sampleRate, true);
    view2.setUint32(28, sampleRate * numChannels * bitsPerSample / 8, true);
    view2.setUint16(32, numChannels * bitsPerSample / 8, true);
    view2.setUint16(34, bitsPerSample, true);
    writeString(36, 'data');
    view2.setUint32(40, dataLength, true);
    
    // Copy audio data
    const audioArray = new Uint8Array(audioData);
    const outputArray = new Uint8Array(buffer);
    outputArray.set(audioArray, 44);
    
    return new Blob([buffer], { type: 'audio/wav' });
  }

  private async extractAudioFromVideo(
    videoFile: File,
    onProgress?: (progress: TranscriptionProgress) => void
  ): Promise<Blob> {
    try {
      onProgress?.({ status: 'processing', progress: 55, message: 'Extracting audio from video...' });

      if (!this.ffmpeg) {
        this.ffmpeg = new FFmpeg();
      }

      // Load FFmpeg if not already loaded (same as working test page)
      if (!this.ffmpeg.loaded) {
        console.log('[WhisperTransformers] Loading FFmpeg...');
        
        try {
          // Try CDN first (more reliable)
          const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd';
          await this.ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
          });
          console.log('[WhisperTransformers] FFmpeg loaded successfully');
        } catch (error) {
          console.error('[WhisperTransformers] Failed to load FFmpeg:', error);
          throw new Error('Failed to load FFmpeg for audio extraction');
        }
      }

      // Write video file to FFmpeg filesystem
      await this.ffmpeg.writeFile('input', await fetchFile(videoFile));

      // Extract audio at 16kHz mono WAV
      await this.ffmpeg.exec([
        '-i', 'input',
        '-ar', '16000',
        '-ac', '1',
        '-f', 'wav',
        'output.wav'
      ]);

      // Read the output
      const data = await this.ffmpeg.readFile('output.wav');
      
      // Clean up
      await this.ffmpeg.deleteFile('input');
      await this.ffmpeg.deleteFile('output.wav');

      onProgress?.({ status: 'processing', progress: 65, message: 'Audio extracted successfully' });

      return new Blob([data], { type: 'audio/wav' });

    } catch (error) {
      console.error('[WhisperTransformers] Audio extraction error:', error);
      throw new Error('Failed to extract audio from video');
    }
  }

  async downloadModel(modelId: string, onProgress?: (progress: number, status: string) => void): Promise<void> {
    // Models are downloaded automatically by Transformers.js when needed
    // This method is here for compatibility
    onProgress?.(100, 'Model will be downloaded automatically when needed');
  }

  isModelDownloaded(modelId: string): boolean {
    // Since Transformers.js handles model caching, we can't easily check
    // Return false to let the UI know it might need downloading
    return false;
  }

  cleanup() {
    this.pipeline = null;
    this.ffmpeg = null;
    this.currentModel = null;
    if (this.audioContext) {
      this.audioContext.close();
      this.audioContext = null;
    }
  }
}

export const whisperTransformersService = new WhisperTransformersService(); 