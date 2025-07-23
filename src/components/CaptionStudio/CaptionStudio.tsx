import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileVideo, 
  Download, 
  Upload, 
  Play, 
  Pause, 
  Plus, 
  Trash2, 
  Edit3,
  Mic,
  Settings,
  Save,
  Loader,
  AlertCircle,
  CheckCircle,
  Type,
  Move,
  Palette,
  Film,
  Languages,
  Clock,
  Wand2,
  Grid3x3
} from 'lucide-react';
import { 
  SubtitleSegment, 
  SubtitleStyle, 
  SubtitlePosition,
  WhisperModel,
  DEFAULT_SUBTITLE_STYLE,
  DEFAULT_SUBTITLE_POSITION,
  WHISPER_MODELS,
  TemplateOptions
} from '../../types/caption-studio';
import { whisperService } from '../../services/whisper.service';
import { webSpeechService } from '../../services/web-speech-transcription.service';
import { SubtitleRenderer } from '../../services/subtitle-renderer.service';
import { subtitleExportService } from '../../services/subtitle-export.service';
import { videoExportService } from '../../services/video-export.service';
import VideoPlayer from './VideoPlayer';
import SubtitleTimeline from './SubtitleTimeline';
import SubtitleEditor from './SubtitleEditor';
import ModelSelector from './ModelSelector';
import StyleEditor from './StyleEditor';
import ExportDialog from './ExportDialog';
import DraggableSubtitle from './DraggableSubtitle';

interface CaptionStudioProps {
  className?: string;
}

const CaptionStudio: React.FC<CaptionStudioProps> = ({ className = '' }) => {
  // State management
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [videoDuration, setVideoDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  
  // Subtitles state
  const [subtitles, setSubtitles] = useState<SubtitleSegment[]>([]);
  const [selectedSubtitle, setSelectedSubtitle] = useState<string | null>(null);
  const [defaultStyle, setDefaultStyle] = useState<SubtitleStyle>(DEFAULT_SUBTITLE_STYLE);
  const [defaultPosition, setDefaultPosition] = useState<SubtitlePosition>(DEFAULT_SUBTITLE_POSITION);
  
  // Whisper state
  const [selectedModel, setSelectedModel] = useState<string>('whisper-tiny.en');
  const [isModelLoading, setIsModelLoading] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcriptionProgress, setTranscriptionProgress] = useState(0);
  
  // UI state
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showStyleEditor, setShowStyleEditor] = useState(false);
  const [showExportDialog, setShowExportDialog] = useState(false);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [isDraggingSubtitle, setIsDraggingSubtitle] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const rendererRef = useRef<SubtitleRenderer | null>(null);

  // Initialize subtitle renderer
  useEffect(() => {
    if (canvasRef.current && videoRef.current) {
      rendererRef.current = new SubtitleRenderer(canvasRef.current);
      rendererRef.current.setSize(videoRef.current.videoWidth || 1920, videoRef.current.videoHeight || 1080);
    }
  }, [videoUrl]);

  // Render subtitles on canvas
  useEffect(() => {
    if (rendererRef.current && videoRef.current) {
      const render = () => {
        rendererRef.current?.renderSubtitles(
          subtitles,
          videoRef.current!.videoWidth,
          videoRef.current!.videoHeight,
          currentTime
        );
      };
      
      render();
      const interval = setInterval(render, 1000 / 30); // 30 FPS
      
      return () => clearInterval(interval);
    }
  }, [subtitles, currentTime]);

  // Handle video upload
  const handleVideoUpload = useCallback(async (file: File) => {
    if (!file.type.startsWith('video/')) {
      showNotification('error', 'Please upload a valid video file');
      return;
    }

    setVideoFile(file);
    const url = URL.createObjectURL(file);
    setVideoUrl(url);
    
    // Reset state
    setSubtitles([]);
    setSelectedSubtitle(null);
    setCurrentTime(0);
    setIsPlaying(false);
  }, []);

  // Load Whisper model
  const loadModel = useCallback(async (modelName: string) => {
    try {
      setIsModelLoading(true);
      setModelLoadProgress(0);
      
      await whisperService.loadModel(modelName, (progress) => {
        setModelLoadProgress(progress);
      });
      
      setSelectedModel(modelName);
      showNotification('success', `Model ${modelName} loaded successfully`);
    } catch (error) {
      showNotification('error', `Failed to load model: ${error}`);
    } finally {
      setIsModelLoading(false);
      setModelLoadProgress(0);
    }
  }, []);

  // Transcribe video
  const handleTranscribe = useCallback(async () => {
    if (!videoFile || !whisperService.isModelLoaded()) {
      showNotification('error', 'Please upload a video and load a model first');
      return;
    }

    try {
      setIsTranscribing(true);
      setTranscriptionProgress(0);
      
      // Extract audio from video
      showNotification('info', 'Extracting audio from video...');
      const audioData = await whisperService.extractAudioFromVideo(videoFile);
      
      // Transcribe
      showNotification('info', 'Transcribing audio...');
      const result = await whisperService.transcribe(audioData, {
        returnTimestamps: 'word',
        onProgress: (progress) => {
          setTranscriptionProgress(progress);
        }
      });
      
      // Convert transcription segments to subtitles
      const newSubtitles: SubtitleSegment[] = result.segments.map((seg, index) => ({
        id: `whisper-${Date.now()}-${index}`,
        startTime: seg.start,
        endTime: seg.end,
        text: seg.text.trim(),
        style: defaultStyle,
        position: defaultPosition
      }));
      
      setSubtitles(prev => [...prev, ...newSubtitles]);
      showNotification('success', `Transcription complete! Added ${newSubtitles.length} subtitles`);
    } catch (error) {
      showNotification('error', `Transcription failed: ${error}`);
    } finally {
      setIsTranscribing(false);
      setTranscriptionProgress(0);
    }
  }, [videoFile, defaultStyle, defaultPosition]);

  // Web Speech API transcription
  const handleWebSpeechTranscribe = useCallback(async () => {
    if (!videoFile || !videoRef.current) {
      showNotification('error', 'Please upload a video first');
      return;
    }

    if (!webSpeechService.isAvailable()) {
      showNotification('error', 'Web Speech API is not available in your browser');
      return;
    }

    try {
      setIsTranscribing(true);
      showNotification('info', 'Starting speech recognition...');
      
      let fullTranscript = '';
      
      await webSpeechService.startTranscription(
        videoRef.current,
        (text: string, isFinal: boolean) => {
          if (isFinal) {
            fullTranscript += ' ' + text;
          }
          // Update progress based on video position
          const progress = (currentTime / videoDuration) * 100;
          setTranscriptionProgress(Math.round(progress));
        },
        (error: Error) => {
          showNotification('error', `Speech recognition error: ${error.message}`);
          setIsTranscribing(false);
        }
      );
      
      // Play the video to start transcription
      videoRef.current.play();
      
      // Stop when video ends
      videoRef.current.addEventListener('ended', () => {
        webSpeechService.stopTranscription();
        
        // Create timed segments from transcript
        const segments = webSpeechService.createTimedSegments(fullTranscript, videoDuration);
        
        const newSubtitles: SubtitleSegment[] = segments.map((seg, index) => ({
          id: `speech-${Date.now()}-${index}`,
          startTime: seg.start,
          endTime: seg.end,
          text: seg.text,
          style: defaultStyle,
          position: defaultPosition
        }));
        
        setSubtitles(prev => [...prev, ...newSubtitles]);
        showNotification('success', `Transcription complete! Added ${newSubtitles.length} subtitles`);
        setIsTranscribing(false);
      });
      
    } catch (error) {
      showNotification('error', `Web Speech failed: ${error}`);
      setIsTranscribing(false);
    }
  }, [videoFile, currentTime, videoDuration, defaultStyle, defaultPosition]);

  // Add subtitle at current time
  const handleAddSubtitle = useCallback(() => {
    const newSubtitle: SubtitleSegment = {
      id: `manual-${Date.now()}`,
      startTime: currentTime,
      endTime: currentTime + 2,
      text: 'New subtitle',
      style: defaultStyle,
      position: defaultPosition
    };
    
    setSubtitles(prev => [...prev, newSubtitle].sort((a, b) => a.startTime - b.startTime));
    setSelectedSubtitle(newSubtitle.id);
  }, [currentTime, defaultStyle, defaultPosition]);

  // Create template
  const handleCreateTemplate = useCallback((options: TemplateOptions) => {
    const templates: SubtitleSegment[] = [];
    const { segmentDuration, overlapDuration, startTime = 0, endTime = videoDuration } = options;
    
    let currentStart = startTime;
    let index = 0;
    
    while (currentStart < endTime && (!options.maxSegments || index < options.maxSegments)) {
      const segmentEnd = Math.min(currentStart + segmentDuration, endTime);
      
      templates.push({
        id: `template-${Date.now()}-${index}`,
        startTime: currentStart,
        endTime: segmentEnd,
        text: '',
        style: defaultStyle,
        position: defaultPosition
      });
      
      currentStart = segmentEnd - overlapDuration;
      index++;
    }
    
    setSubtitles(prev => [...prev, ...templates].sort((a, b) => a.startTime - b.startTime));
    showNotification('success', `Created ${templates.length} subtitle templates`);
  }, [videoDuration, defaultStyle, defaultPosition]);

  // Update subtitle
  const handleUpdateSubtitle = useCallback((id: string, updates: Partial<SubtitleSegment>) => {
    setSubtitles(prev => prev.map(sub => 
      sub.id === id ? { ...sub, ...updates } : sub
    ));
  }, []);

  // Delete subtitle
  const handleDeleteSubtitle = useCallback((id: string) => {
    setSubtitles(prev => prev.filter(sub => sub.id !== id));
    if (selectedSubtitle === id) {
      setSelectedSubtitle(null);
    }
  }, [selectedSubtitle]);

  // Export subtitles
  const handleExportSubtitles = useCallback((format: string) => {
    const filename = videoFile?.name.replace(/\.[^/.]+$/, '') || 'subtitles';
    
    switch (format) {
      case 'srt':
        subtitleExportService.exportSubtitles(subtitles, { format: 'srt', includeStyles: false, encoding: 'utf-8' }, filename);
        break;
      case 'vtt':
        subtitleExportService.exportSubtitles(subtitles, { format: 'vtt', includeStyles: true, encoding: 'utf-8' }, filename);
        break;
      case 'ass':
        subtitleExportService.exportSubtitles(subtitles, { format: 'ass', includeStyles: true, encoding: 'utf-8' }, filename);
        break;
      case 'json':
        subtitleExportService.exportSubtitles(subtitles, { format: 'json', includeStyles: true, encoding: 'utf-8' }, filename);
        break;
    }
    
    showNotification('success', `Exported subtitles as ${format.toUpperCase()}`);
  }, [subtitles, videoFile]);

  // Export video
  const handleExportVideo = useCallback(async (options: any) => {
    if (!videoRef.current) return;
    
    try {
      showNotification('info', 'Starting video export...');
      
      const blob = await videoExportService.exportVideo(
        videoRef.current,
        subtitles,
        {
          burnSubtitles: options.burnSubtitles,
          format: options.format,
          quality: options.quality,
          fps: options.fps
        },
        (progress) => {
          // Update progress UI
          console.log(`Export progress: ${progress}%`);
        }
      );
      
      // Download video
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoFile?.name.replace(/\.[^/.]+$/, '') || 'video'}_subtitled.${options.format}`;
      a.click();
      URL.revokeObjectURL(url);
      
      showNotification('success', 'Video exported successfully!');
    } catch (error) {
      showNotification('error', `Video export failed: ${error}`);
    }
  }, [videoRef, subtitles, videoFile]);

  // Show notification
  const showNotification = (type: 'success' | 'error' | 'info', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  return (
    <div className={`caption-studio ${className}`}>
      {/* Header */}
      <div className="bg-gray-900 border-b border-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Film className="w-8 h-8 text-purple-500" />
            <h1 className="text-2xl font-bold text-white">Caption Studio</h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Model selector button */}
            <button
              onClick={() => setShowModelSelector(true)}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-all flex items-center gap-2"
            >
              <Languages className="w-4 h-4" />
              {selectedModel}
            </button>
            
            {/* Test button to manually load model */}
            <button
              onClick={async () => {
                try {
                  console.log('Testing model load...');
                  await loadModel('whisper-tiny.en');
                  console.log('Model loaded successfully!');
                } catch (error) {
                  console.error('Model loading error:', error);
                }
              }}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all flex items-center gap-2"
            >
              <Loader className="w-4 h-4" />
              Test Load Model
            </button>

            {/* Export button */}
            <button
              onClick={() => setShowExportDialog(true)}
              disabled={subtitles.length === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col lg:flex-row h-full">
        {/* Video section */}
        <div className="flex-1 p-4">
          {!videoUrl ? (
            // Video upload
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="h-full flex items-center justify-center"
            >
              <div
                className="w-full max-w-lg p-8 border-2 border-dashed border-gray-700 rounded-xl hover:border-purple-600 transition-all cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files[0];
                  if (file) handleVideoUpload(file);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleVideoUpload(file);
                  }}
                  className="hidden"
                />
                
                <div className="text-center">
                  <FileVideo className="w-16 h-16 text-gray-500 mx-auto mb-4" />
                  <h3 className="text-xl font-semibold text-white mb-2">Upload Video</h3>
                  <p className="text-gray-400">Click to browse or drag and drop</p>
                  <p className="text-sm text-gray-500 mt-2">Supported: MP4, WebM, MOV</p>
                </div>
              </div>
            </motion.div>
          ) : (
            // Video player with overlay
            <div className="relative h-full">
              <VideoPlayer
                ref={videoRef}
                src={videoUrl}
                onTimeUpdate={setCurrentTime}
                onDurationChange={setVideoDuration}
                onPlayPause={setIsPlaying}
                className="w-full h-full"
              />
              
              {/* Canvas overlay for subtitles */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{ mixBlendMode: 'normal' }}
              />
              
              {/* Draggable subtitle editor */}
              {isDraggingSubtitle && selectedSubtitle && (
                <DraggableSubtitle
                  subtitle={subtitles.find(s => s.id === selectedSubtitle)!}
                  videoWidth={videoRef.current?.videoWidth || 1920}
                  videoHeight={videoRef.current?.videoHeight || 1080}
                  onUpdate={(updates) => handleUpdateSubtitle(selectedSubtitle, updates)}
                />
              )}
              
              {/* Controls overlay */}
              <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent">
                <div className="flex items-center gap-4">
                  <button
                    onClick={handleAddSubtitle}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-all flex items-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add at {formatTime(currentTime)}
                  </button>
                  
                  <button
                    onClick={() => setShowTemplateDialog(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all flex items-center gap-2"
                  >
                    <Grid3x3 className="w-4 h-4" />
                    Create Template
                  </button>
                  
                  <button
                    onClick={handleTranscribe}
                    disabled={!whisperService.isModelLoaded() || isTranscribing}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2"
                  >
                    {isTranscribing ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                    {isTranscribing ? `Transcribing... ${transcriptionProgress}%` : 'Auto Transcribe'}
                  </button>
                  
                  {/* Web Speech API Fallback */}
                  {webSpeechService.isAvailable() && (
                    <button
                      onClick={handleWebSpeechTranscribe}
                      disabled={isTranscribing}
                      className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2"
                      title="Use browser's speech recognition (Chrome/Edge only)"
                    >
                      <Mic className="w-4 h-4" />
                      Web Speech
                    </button>
                  )}
                  
                  <button
                    onClick={() => setIsDraggingSubtitle(!isDraggingSubtitle)}
                    disabled={!selectedSubtitle}
                    className={`px-4 py-2 ${isDraggingSubtitle ? 'bg-orange-600' : 'bg-gray-600'} hover:bg-opacity-80 disabled:bg-gray-700 disabled:opacity-50 text-white rounded-lg transition-all flex items-center gap-2`}
                  >
                    <Move className="w-4 h-4" />
                    {isDraggingSubtitle ? 'Stop Moving' : 'Move Subtitle'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="w-full lg:w-96 bg-gray-900 border-l border-gray-800">
          {videoUrl && (
            <>
              {/* Timeline */}
              <div className="border-b border-gray-800 p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Timeline</h3>
                <SubtitleTimeline
                  subtitles={subtitles}
                  duration={videoDuration}
                  currentTime={currentTime}
                  selectedId={selectedSubtitle}
                  onSelect={setSelectedSubtitle}
                  onTimeClick={(time) => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = time;
                    }
                  }}
                />
              </div>

              {/* Subtitle editor */}
              <div className="flex-1 overflow-y-auto p-4">
                <h3 className="text-lg font-semibold text-white mb-4">Subtitles</h3>
                {subtitles.length === 0 ? (
                  <p className="text-gray-400 text-center py-8">
                    No subtitles yet. Add manually or use auto-transcribe.
                  </p>
                ) : (
                  <SubtitleEditor
                    subtitles={subtitles}
                    selectedId={selectedSubtitle}
                    onSelect={setSelectedSubtitle}
                    onUpdate={handleUpdateSubtitle}
                    onDelete={handleDeleteSubtitle}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showModelSelector && (
          <ModelSelector
            models={WHISPER_MODELS}
            selectedModel={selectedModel}
            isLoading={isModelLoading}
            loadProgress={modelLoadProgress}
            onSelect={loadModel}
            onClose={() => setShowModelSelector(false)}
          />
        )}

        {showStyleEditor && (
          <StyleEditor
            style={defaultStyle}
            position={defaultPosition}
            onUpdateStyle={setDefaultStyle}
            onUpdatePosition={setDefaultPosition}
            onClose={() => setShowStyleEditor(false)}
          />
        )}

        {showExportDialog && (
          <ExportDialog
            onExportSubtitles={handleExportSubtitles}
            onExportVideo={handleExportVideo}
            onClose={() => setShowExportDialog(false)}
          />
        )}
      </AnimatePresence>

      {/* Notifications */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 p-4 rounded-lg shadow-lg flex items-center gap-3"
            style={{
              backgroundColor: notification.type === 'error' ? '#DC2626' :
                             notification.type === 'success' ? '#10B981' : '#3B82F6'
            }}
          >
            {notification.type === 'error' && <AlertCircle className="w-5 h-5 text-white" />}
            {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-white" />}
            {notification.type === 'info' && <Loader className="w-5 h-5 text-white animate-spin" />}
            <span className="text-white">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Utility function
const formatTime = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default CaptionStudio; 