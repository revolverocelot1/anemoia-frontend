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
import { optimizedVideoExportService } from '../../services/optimized-video-export.service';
import { videoVerificationService } from '../../services/video-verification.service';
import { subtitleVerificationService } from '../../services/subtitle-verification.service';
import { createOffscreenSubtitleRenderer } from '../../services/offscreen-subtitle-renderer.service';
import { TranscriptionLoadingOverlay } from '../TranscriptionLoadingOverlay';
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
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [exportError, setExportError] = useState<string | null>(null);
  
  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const subtitleCanvasRef = useRef<HTMLCanvasElement>(null);
  const subtitleRendererRef = useRef<SubtitleRenderer | null>(null);

  // Initialize subtitle renderer with optimized settings
  useEffect(() => {
    if (subtitleCanvasRef.current) {
      const renderer = new SubtitleRenderer(subtitleCanvasRef.current);
      subtitleRendererRef.current = renderer;
    }
  }, []);

  // Render subtitles on canvas with optimized animation frame
  useEffect(() => {
    if (subtitleRendererRef.current && videoRef.current && videoRef.current.videoWidth > 0) {
      let animationId: number;
      let lastRenderTime = 0;
      const targetFps = 24; // Lower FPS for smoother performance
      const frameDelay = 1000 / targetFps;
      
      const render = (timestamp: number) => {
        // Only render if enough time has passed
        if (timestamp - lastRenderTime >= frameDelay) {
          // Only render if we have valid video dimensions
          if (videoRef.current && videoRef.current.videoWidth > 0) {
            subtitleRendererRef.current?.renderSubtitles(
              subtitles,
              videoRef.current.videoWidth,
              videoRef.current.videoHeight,
              currentTime
            );
          }
          lastRenderTime = timestamp;
        }
        
        animationId = requestAnimationFrame(render);
      };
      
      // Start render loop only if video is playing
      if (isPlaying || subtitles.length > 0) {
        animationId = requestAnimationFrame(render);
      }
      
      return () => {
        if (animationId) {
          cancelAnimationFrame(animationId);
        }
      };
    }
  }, [subtitles, currentTime, isPlaying]);

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
    // Early return if no video or model
    if (!videoFile) {
      showNotification('error', 'Please upload a video first');
      return;
    }
    
    if (!whisperService.isModelLoaded()) {
      showNotification('error', 'Please load a model first');
      return;
    }

    try {
      setIsTranscribing(true);
      setTranscriptionProgress(0);
      
      // Extract audio from video
      showNotification('info', 'Extracting audio from video...');
      const audioData = await whisperService.extractAudioFromVideo(videoFile);
      
      // Update progress to show extraction complete
      setTranscriptionProgress(20);
      
      // Transcribe with progress updates
      showNotification('info', 'Transcribing audio...');
      const result = await whisperService.transcribe(audioData, {
        language: 'auto',
        model: selectedModel || 'whisper-base',
        task: 'transcribe',
        return_timestamps: true
      }, (progress: number, status: string) => {
        setTranscriptionProgress(progress);
        // Update the loading overlay message if needed
        if (status && status !== 'Transcribing...') {
          showNotification('info', status);
        }
      });
      
      // Convert transcription segments to subtitles
      const newSubtitles: SubtitleSegment[] = result.segments.map((seg: any, index: number) => ({
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
      console.error('[CaptionStudio] Transcription error:', error);
      showNotification('error', `Transcription failed: ${error}`);
    } finally {
      setIsTranscribing(false);
      setTranscriptionProgress(0);
    }
  }, [videoFile, defaultStyle, defaultPosition, selectedModel]);

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
      
      // Set up event handlers
      webSpeechService.onSegment = (segment) => {
        fullTranscript += ' ' + segment.text;
        // Update progress based on video position
        const progress = (currentTime / videoDuration) * 100;
        setTranscriptionProgress(progress);
      };
      
      webSpeechService.onError = (error) => {
        showNotification('error', `Speech recognition error: ${error}`);
      };
      
      // Start transcription
      await webSpeechService.startTranscription({
        language: 'en-US',
        continuous: true,
        interimResults: true
      });
      
      // Play the video to start transcription
      videoRef.current.play();
      
      // Stop when video ends
      videoRef.current.addEventListener('ended', () => {
        webSpeechService.stopTranscription();
        
        // Create timed segments from transcript
        const segments = webSpeechService.createTimedSegments(fullTranscript, videoDuration);
        
        const newSubtitles: SubtitleSegment[] = segments.map((seg: any, index: number) => ({
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

  // Export video with FFmpeg service
  const handleExportVideo = useCallback(async (options: any) => {
    if (!videoRef.current) return;

    try {
      setIsExporting(true);
      setExportProgress(0);
      setExportError(null);

      console.log('[CaptionStudio] Starting video export with options:', options);

      // Create a video blob from the current video element
      const videoBlob = await videoVerificationService.getVideoBlob(videoRef.current);
      if (!videoBlob) {
        throw new Error('Failed to get video blob');
      }

      let exportedBlob: Blob;

      // Use optimized export service
      console.log('[CaptionStudio] Using optimized export service...');
      exportedBlob = await optimizedVideoExportService.exportVideo(
        videoRef.current,
        subtitles,
        {
          format: options.format || 'mp4',
          quality: options.quality || 'high',
          resolution: options.resolution || '1080p',
          burnSubtitles: options.embedType === 'burn',
          embedSubtitles: options.embedType === 'track',
          embedType: options.embedType || 'burn',
          fps: 30
        },
        (progress: number) => {
          setExportProgress(Math.round(progress));
        }
      );

      console.log('[CaptionStudio] Export completed, running verification tests...');

      // Run verification tests
      const subtitleTimes = subtitles.map(sub => ({ start: sub.startTime, end: sub.endTime }));
      const testResults = await videoVerificationService.runComprehensiveTest(
        exportedBlob,
        subtitleTimes,
        videoDuration,
        options.embedType === 'burn',
        options.embedType === 'track'
      );

      console.log('[CaptionStudio] Test results:', testResults.summary);

      if (!testResults.passed) {
        showNotification('error', 'Export verification failed. Check console for details.');
        console.error('[CaptionStudio] Export verification failed:', testResults);
      } else {
        showNotification('success', 'Export verified successfully!');
      }

      // Create test page for manual verification
      const testPageUrl = await videoVerificationService.createTestPage(exportedBlob);

      // Download the exported video
      const url = URL.createObjectURL(exportedBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `video-with-subtitles.${options.format || 'mp4'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      // Open test page in new tab for manual verification
      if (testResults.passed) {
        window.open(testPageUrl, '_blank');
        showNotification('info', 'Test page opened in new tab for manual verification');
      }

      // Cleanup URLs after a delay
      setTimeout(() => {
      URL.revokeObjectURL(url);
        URL.revokeObjectURL(testPageUrl);
      }, 60000); // Clean up after 1 minute

      console.log('[CaptionStudio] Export and verification completed');
      // Show success notification
      setShowExportDialog(false);
    } catch (error) {
      console.error('[CaptionStudio] Export failed:', error);
      setExportError(error instanceof Error ? error.message : 'Export failed');
      showNotification('error', `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [subtitles, videoDuration]);

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
            currentSubtitlesLength={subtitles.length}
            videoDuration={videoDuration}
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

      {/* Transcription Loading Overlay */}
      <TranscriptionLoadingOverlay
        isLoading={isTranscribing}
        progress={transcriptionProgress}
        message={transcriptionProgress > 0 ? 'Transcribing audio...' : 'Initializing transcription...'}
      />
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