import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubtitleStore } from '../../stores/subtitle-store';
import { WHISPER_MODELS } from '../../config/whisper-models';
import { audioExtractor } from '../../lib/audio-utils';
import type { WorkerMessage, WorkerResponse } from '../../workers/whisper.worker';

interface TranscriptionPanelProps {
  onTranscriptionComplete?: () => void;
}

export const TranscriptionPanel: React.FC<TranscriptionPanelProps> = ({
  onTranscriptionComplete
}) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<{
    status: string;
    progress: number;
    file?: string;
  } | null>(null);
  
  const workerRef = useRef<Worker | null>(null);
  const audioDataRef = useRef<Float32Array | null>(null);
  
  const {
    currentProject,
    selectedModel,
    setSelectedModel,
    addSegment,
    setIsTranscribing: setStoreTranscribing,
    setTranscriptionProgress
  } = useSubtitleStore();
  
  // Initialize worker
  const initializeWorker = useCallback(() => {
    if (!workerRef.current) {
      workerRef.current = new Worker(
        new URL('../../workers/whisper.worker.ts', import.meta.url),
        { type: 'module' }
      );
      
      workerRef.current.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const { type, data } = event.data;
        
        switch (type) {
          case 'progress':
            setLoadingProgress({
              status: data.status,
              progress: data.progress || 0,
              file: data.file
            });
            setTranscriptionProgress(data.progress || 0);
            break;
            
          case 'loaded':
            setLoadingProgress(null);
            if (audioDataRef.current) {
              startTranscription(audioDataRef.current);
            }
            break;
            
          case 'result':
            handleTranscriptionResult(data);
            break;
            
          case 'error':
            setError(data.message);
            setIsTranscribing(false);
            setStoreTranscribing(false);
            break;
        }
      };
    }
    
    return workerRef.current;
  }, [setStoreTranscribing, setTranscriptionProgress]);
  
  // Handle transcription result
  const handleTranscriptionResult = (result: any) => {
    if (!currentProject || !currentProject.activeTrackId) return;
    
    const activeTrack = currentProject.tracks.find(
      t => t.id === currentProject.activeTrackId
    );
    
    if (!activeTrack) return;
    
    // Clear existing segments
    activeTrack.segments = [];
    
    // Add transcribed segments
    if (result.chunks && result.chunks.length > 0) {
      result.chunks.forEach((chunk: any) => {
        const [startTime, endTime] = chunk.timestamp;
        addSegment(activeTrack.id, {
          text: chunk.text.trim(),
          startTime,
          endTime,
          confidence: chunk.confidence || 0.9
        });
      });
    } else if (result.text) {
      // Single segment for entire transcription
      addSegment(activeTrack.id, {
        text: result.text.trim(),
        startTime: 0,
        endTime: currentProject.videoDuration,
        confidence: 0.9
      });
    }
    
    setIsTranscribing(false);
    setStoreTranscribing(false);
    onTranscriptionComplete?.();
  };
  
  // Extract audio from video
  const extractAudio = async () => {
    if (!currentProject) return null;
    
    try {
      let audioData: Float32Array;
      
      if (currentProject.videoFile) {
        audioData = await audioExtractor.extractFromVideo(currentProject.videoFile);
      } else if (currentProject.videoUrl) {
        audioData = await audioExtractor.extractFromURL(currentProject.videoUrl);
      } else {
        throw new Error('No video source available');
      }
      
      // Resample to 16kHz if needed (Whisper expects 16kHz)
      audioData = audioExtractor.resampleAudio(audioData, 48000, 16000);
      
      return audioData;
    } catch (error) {
      console.error('Audio extraction error:', error);
      throw error;
    }
  };
  
  // Start transcription
  const startTranscription = (audioData: Float32Array) => {
    const worker = workerRef.current;
    if (!worker) return;
    
    const message: WorkerMessage = {
      type: 'transcribe',
      data: {
        audio: audioData,
        options: {
          language: 'en', // TODO: Make this configurable
          task: 'transcribe',
          return_timestamps: true,
          chunk_length_s: 30,
          stride_length_s: 5
        }
      }
    };
    
    worker.postMessage(message);
  };
  
  // Handle transcribe button click
  const handleTranscribe = async () => {
    if (!currentProject || isTranscribing) return;
    
    setError(null);
    setIsTranscribing(true);
    setStoreTranscribing(true);
    
    try {
      // Initialize worker
      const worker = initializeWorker();
      
      // Extract audio
      const audioData = await extractAudio();
      if (!audioData) {
        throw new Error('Failed to extract audio from video');
      }
      
      audioDataRef.current = audioData;
      
      // Load model
      const selectedModelConfig = WHISPER_MODELS.find(m => m.id === selectedModel);
      if (!selectedModelConfig) {
        throw new Error('Invalid model selected');
      }
      
      const message: WorkerMessage = {
        type: 'load',
        data: {
          modelPath: selectedModelConfig.modelPath,
          quantized: selectedModelConfig.quantized,
          device: 'wasm' // WebGPU support can be added later
        }
      };
      
      worker.postMessage(message);
    } catch (error) {
      console.error('Transcription error:', error);
      setError(error instanceof Error ? error.message : 'Transcription failed');
      setIsTranscribing(false);
      setStoreTranscribing(false);
    }
  };
  
  // Cleanup
  React.useEffect(() => {
    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      audioExtractor.dispose();
    };
  }, []);
  
  return (
    <motion.div
      className="bg-gray-800 rounded-lg p-4 space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
    >
      <h3 className="text-lg font-medium text-white">AI Transcription</h3>
      
      {/* Model Selection */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Select Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          disabled={isTranscribing}
          className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
        >
          {WHISPER_MODELS.map(model => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.size}) - {model.language}
            </option>
          ))}
        </select>
      </div>
      
      {/* Transcribe Button */}
      <motion.button
        onClick={handleTranscribe}
        disabled={isTranscribing || !currentProject}
        className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
          isTranscribing
            ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
            : 'bg-cyan-600 hover:bg-cyan-700 text-white'
        }`}
        whileHover={!isTranscribing ? { scale: 1.02 } : {}}
        whileTap={!isTranscribing ? { scale: 0.98 } : {}}
      >
        {isTranscribing ? (
          <div className="flex items-center justify-center gap-2">
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>Transcribing...</span>
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <span className="material-symbols-outlined">mic</span>
            <span>Transcribe Audio</span>
          </div>
        )}
      </motion.button>
      
      {/* Loading Progress */}
      <AnimatePresence>
        {loadingProgress && (
          <motion.div
            className="bg-gray-700 rounded-lg p-3"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="text-sm text-gray-300 mb-2">
              {loadingProgress.status === 'loading' ? 'Loading model...' : loadingProgress.status}
              {loadingProgress.file && (
                <span className="text-xs text-gray-500 block">{loadingProgress.file}</span>
              )}
            </div>
            <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
              <motion.div
                className="h-full bg-cyan-500"
                initial={{ width: 0 }}
                animate={{ width: `${loadingProgress.progress || 0}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Error Display */}
      <AnimatePresence>
        {error && (
          <motion.div
            className="bg-red-500/20 border border-red-500 rounded-lg p-3 text-sm text-red-300"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-red-500">error</span>
              <span>{error}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Instructions */}
      <div className="text-xs text-gray-500 space-y-1">
        <p>• AI will automatically detect speech and generate timed subtitles</p>
        <p>• Larger models provide better accuracy but take longer to load</p>
        <p>• You can edit the generated subtitles after transcription</p>
      </div>
    </motion.div>
  );
};

export default TranscriptionPanel; 