import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSubtitleStore } from '../stores/subtitle-store';
import { authService } from '../services/auth.service';
import whisperService from '../services/whisper.service';
import { getWebSpeechTranscriptionService } from '../services/web-speech-transcription.service';
import { exportSubtitles, importFromSRT, importFromWebVTT } from '../utils/subtitle-utils';
import { SubtitleStyleControls } from '../components/SubtitleStyleControls';
import { videoExportService } from '../services/video-export.service';
import DraggableSubtitle from '../components/CaptionStudio/DraggableSubtitle';
import Header from '../components/Header';
import Footer from '../components/Footer';
import type { SubtitleSegment, SubtitleStyle } from '../types/subtitle';
import { 
  Upload, Play, Pause, Download, Plus, Trash2, Save, 
  FileText, Film, Mic, MicOff, Settings, ChevronLeft,
  ChevronRight, SkipBack, SkipForward, Volume2, Eye,
  EyeOff, Languages, Loader2, Check, X, Edit, Move
} from 'lucide-react';

const SubtitlePageEnhanced: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  
  // Store state
  const {
    currentProject,
    activeTrackId,
    selectedSegmentId,
    playbackTime,
    isPlaying,
    isTranscribing,
    selectedModel,
    subtitleStyle,
    createProject,
    setVideoUrl,
    setVideoFile,
    setVideoDuration,
    setVideoSize,
    setPlaybackTime,
    setIsPlaying,
    addSegment,
    updateSegment,
    deleteSegment,
    selectSegment,
    addSegments,
    setIsTranscribing,
    setSelectedModel
  } = useSubtitleStore();
  
  // Local state
  const [transcriptionMode, setTranscriptionMode] = useState<'whisper' | 'webspeech'>('whisper');
  const [isRecording, setIsRecording] = useState(false);
  const [editingSegmentId, setEditingSegmentId] = useState<string | null>(null);
  const [volume, setVolume] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [showStyleControls, setShowStyleControls] = useState(true);
  const [showModelDownload, setShowModelDownload] = useState(false);
  const [modelDownloadProgress, setModelDownloadProgress] = useState<Record<string, number>>({});
  const [modelDownloadStatus, setModelDownloadStatus] = useState<Record<string, string>>({});
  const [isExportingVideo, setIsExportingVideo] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);
  const [isDraggableMode, setIsDraggableMode] = useState(false);
  const [currentVideoFile, setCurrentVideoFile] = useState<File | null>(null);
  
  // Get current track and segments
  const currentTrack = currentProject?.tracks.find(t => t.id === activeTrackId);
  const segments = currentTrack?.segments || [];
  
  // Get available models
  const availableModels = whisperService.getAvailableModels();
  
  // Check authentication on mount
  useEffect(() => {
    // Authentication check removed - direct access allowed
  }, [navigate]);
  
  // Handle video file upload
  const handleVideoUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const url = URL.createObjectURL(file);
      
      // Store the file reference
      setCurrentVideoFile(file);
      
      // Create new project if none exists
      if (!currentProject) {
        createProject({
          name: file.name.replace(/\.[^/.]+$/, ''),
          videoUrl: url,
          videoName: file.name
        });
      } else {
        setVideoUrl(url);
      }
      
      setVideoFile(file);
    }
  };
  
  // Handle video metadata
  const handleVideoLoaded = () => {
    if (videoRef.current) {
      setVideoDuration(videoRef.current.duration);
      setVideoSize(videoRef.current.videoWidth, videoRef.current.videoHeight);
    }
  };
  
  // Handle playback time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setPlaybackTime(videoRef.current.currentTime);
    }
  };
  
  // Playback controls
  const togglePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const skipBackward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 5);
    }
  };
  
  const skipForward = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(
        videoRef.current.duration,
        videoRef.current.currentTime + 5
      );
    }
  };
  
  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
    }
  };
  
  // Download model
  const handleDownloadModel = async (modelId: string) => {
    try {
      await whisperService.downloadModel(modelId, (progress, status) => {
        setModelDownloadProgress(prev => ({ ...prev, [modelId]: progress }));
        setModelDownloadStatus(prev => ({ ...prev, [modelId]: status }));
      });
      
      // Set as selected model after download
      setSelectedModel(modelId);
    } catch (error) {
      console.error('Failed to download model:', error);
      setModelDownloadStatus(prev => ({ ...prev, [modelId]: 'Failed to download' }));
    }
  };
  
  // Start transcription
  const startTranscription = async () => {
    if (!videoRef.current || !currentProject || !activeTrackId) {
      alert('Please upload a video first');
      return;
    }
    
    if (!currentVideoFile) {
      alert('Video file not found. Please re-upload the video.');
      return;
    }
    
    // Check if model is downloaded
    const model = availableModels.find(m => m.id === selectedModel);
    // TEMPORARILY BYPASSING MODEL CHECK FOR TESTING
    // if (!model?.downloaded && transcriptionMode === 'whisper') {
    //   setShowModelDownload(true);
    //   return;
    // }
    
    setIsTranscribing(true);
    
    try {
      if (transcriptionMode === 'whisper') {
        console.log('[Transcription] Starting AI transcription...');
        
        // Extract audio from video
        let audioData: ArrayBuffer;
        try {
          audioData = await whisperService.extractAudioFromVideo(currentVideoFile);
          console.log('[Transcription] Audio extracted successfully');
        } catch (error) {
          console.error('[Transcription] Audio extraction failed:', error);
          throw new Error('Failed to extract audio from video. Please try again.');
        }
        
        const result = await whisperService.transcribe(
          audioData,
          {
            language: 'auto',
            model: selectedModel,
            task: 'transcribe',
            return_timestamps: true
          },
          (progress, status) => {
            console.log(`[Transcription] Progress: ${progress}% - ${status}`);
          }
        );
        
        console.log('[Transcription] Result:', result);
        
        // Convert to subtitle segments
        const newSegments = result.segments.map((seg, index) => ({
          id: `segment-${Date.now()}-${index}`,
          text: seg.text,
          startTime: seg.start,
          endTime: seg.end,
          confidence: seg.confidence
        }));
        
        if (newSegments.length === 0) {
          throw new Error('No subtitles were generated. Please check your audio.');
        }
        
        addSegments(activeTrackId, newSegments);
        console.log(`[Transcription] Added ${newSegments.length} subtitle segments`);
      } else {
        // Use Web Speech API
        const webSpeechService = getWebSpeechTranscriptionService();
        
        webSpeechService.onSegment = (segment) => {
          addSegment(activeTrackId, segment);
        };
        
        webSpeechService.onError = (error) => {
          console.error('[Transcription] Web Speech error:', error);
          alert(`Speech recognition error: ${error}`);
          setIsRecording(false);
          setIsTranscribing(false);
        };
        
        webSpeechService.onEnd = () => {
          setIsRecording(false);
          setIsTranscribing(false);
        };
        
        webSpeechService.start({ language: 'en-US', continuous: true });
        setIsRecording(true);
      }
    } catch (error) {
      console.error('[Transcription] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Transcription failed. Please try again.';
      alert(errorMessage);
    } finally {
      if (transcriptionMode === 'whisper') {
        setIsTranscribing(false);
      }
    }
  };
  
  // Stop transcription
  const stopTranscription = () => {
    if (transcriptionMode === 'webspeech') {
      const webSpeechService = getWebSpeechTranscriptionService();
      webSpeechService.stop();
      setIsRecording(false);
    }
    setIsTranscribing(false);
  };
  
  // Add new segment
  const addNewSegment = () => {
    if (!activeTrackId || !videoRef.current) return;
    
    const currentTime = videoRef.current.currentTime;
    addSegment(activeTrackId, {
      text: 'New subtitle',
      startTime: currentTime,
      endTime: currentTime + 2
    });
  };
  
  // Delete selected segment
  const deleteSelectedSegment = () => {
    if (!activeTrackId || !selectedSegmentId) return;
    deleteSegment(activeTrackId, selectedSegmentId);
  };
  
  // Handle segment click
  const handleSegmentClick = (segment: SubtitleSegment) => {
    selectSegment(segment.id);
    if (videoRef.current) {
      videoRef.current.currentTime = segment.startTime;
    }
  };
  
  // Handle segment edit
  const handleSegmentEdit = (segmentId: string, text: string) => {
    if (!activeTrackId) return;
    updateSegment(activeTrackId, segmentId, { text });
    setEditingSegmentId(null);
  };
  
  // Export subtitles
  const handleExport = (format: 'srt' | 'vtt') => {
    if (!currentTrack) return;
    exportSubtitles(currentTrack.segments, format, `${currentProject?.name || 'subtitles'}.${format}`);
  };
  
  // Export video with burned subtitles
  const handleExportVideo = async () => {
    if (!videoRef.current || !currentTrack) return;
    
    setIsExportingVideo(true);
    setExportProgress(0);
    
    try {
      // Convert segments to the expected format
      const convertedSegments = currentTrack.segments.map(seg => ({
        ...seg,
        text: seg.text,
        startTime: seg.startTime,
        endTime: seg.endTime,
        style: subtitleStyle // Use the current subtitle style
      }));
      
      const blob = await videoExportService.exportVideo(
        videoRef.current,
        convertedSegments as any,
        {
          format: 'mp4',
          quality: 'high',
          burnSubtitles: true,
          fps: 30,
          bitrate: 5000000
        },
        (progress) => {
          setExportProgress(progress);
        }
      );
      
      // Download the video
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProject?.name || 'video'}_with_subtitles.mp4`;
      a.click();
      URL.revokeObjectURL(url);
      
      // Show success message
      alert('Video exported successfully with burned subtitles!');
    } catch (error) {
      console.error('Export error:', error);
      alert('Failed to export video. Please try again.');
    } finally {
      setIsExportingVideo(false);
      setExportProgress(0);
    }
  };
  
  // Import subtitles
  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeTrackId) return;
    
    const text = await file.text();
    let segments: SubtitleSegment[] = [];
    
    if (file.name.endsWith('.srt')) {
      segments = importFromSRT(text);
    } else if (file.name.endsWith('.vtt')) {
      segments = importFromWebVTT(text);
    }
    
    if (segments.length > 0) {
      addSegments(activeTrackId, segments);
    }
  };
  
  // Format time for display
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };
  
  // Calculate subtitle position based on style
  const getSubtitlePosition = (style: SubtitleStyle) => {
    const position = style.position || 'bottom-center';
    const marginX = style.marginX || 10;
    const marginY = style.marginY || 10;
    
    const positions: Record<string, React.CSSProperties> = {
      'top-left': { top: marginY, left: marginX, transform: 'none' },
      'top-center': { top: marginY, left: '50%', transform: 'translateX(-50%)' },
      'top-right': { top: marginY, right: marginX, transform: 'none' },
      'middle-left': { top: '50%', left: marginX, transform: 'translateY(-50%)' },
      'middle-center': { top: '50%', left: '50%', transform: 'translate(-50%, -50%)' },
      'middle-right': { top: '50%', right: marginX, transform: 'translateY(-50%)' },
      'bottom-left': { bottom: marginY, left: marginX, transform: 'none' },
      'bottom-center': { bottom: marginY, left: '50%', transform: 'translateX(-50%)' },
      'bottom-right': { bottom: marginY, right: marginX, transform: 'none' },
    };
    
    return positions[position] || positions['bottom-center'];
  };
  
  return (
    <div className="relative flex size-full min-h-screen flex-col bg-gradient-to-br from-gray-900 via-gray-950 to-black">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        
        <main className="flex flex-1 flex-col px-4 py-6 max-w-[1600px] mx-auto w-full">
          {/* Top toolbar with better organization */}
          <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl border border-gray-800 p-4 mb-6 shadow-2xl">
            <div className="flex items-center justify-between flex-wrap gap-4">
              {/* Left section - Upload and Import */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg hover:shadow-blue-500/25 font-medium"
                >
                  <Upload className="w-4 h-4" />
                  Upload Video
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleVideoUpload}
                  className="hidden"
                />
                
                <button
                  onClick={() => importInputRef.current?.click()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 hover:text-white transition-all duration-200 border border-gray-700 font-medium"
                >
                  <FileText className="w-4 h-4" />
                  Import
                </button>
                <input
                  ref={importInputRef}
                  type="file"
                  accept=".srt,.vtt"
                  onChange={handleImport}
                  className="hidden"
                />
                
                <div className="h-8 w-px bg-gray-700 mx-2" />
                
                <button
                  onClick={() => setShowStyleControls(!showStyleControls)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 font-medium ${
                    showStyleControls 
                      ? 'bg-purple-600/20 text-purple-400 border border-purple-500/50' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
                  }`}
                >
                  {showStyleControls ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                  Styling
                </button>
                
                <button
                  onClick={() => setIsDraggableMode(!isDraggableMode)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 font-medium ${
                    isDraggableMode 
                      ? 'bg-green-600/20 text-green-400 border border-green-500/50' 
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700 hover:text-white border border-gray-700'
                  }`}
                >
                  <Move className="w-4 h-4" />
                  {isDraggableMode ? 'Position Mode' : 'Static Mode'}
                </button>
              </div>
              
              {/* Right section - Export options */}
              <div className="flex items-center gap-3">
                <button
                  onClick={() => handleExport('srt')}
                  disabled={!currentTrack || segments.length === 0}
                  className="px-5 py-2.5 bg-green-600/20 text-green-400 rounded-xl hover:bg-green-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 border border-green-500/50 font-medium"
                >
                  SRT
                </button>
                <button
                  onClick={() => handleExport('vtt')}
                  disabled={!currentTrack || segments.length === 0}
                  className="px-5 py-2.5 bg-green-600/20 text-green-400 rounded-xl hover:bg-green-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 border border-green-500/50 font-medium"
                >
                  VTT
                </button>
                <button
                  onClick={handleExportVideo}
                  disabled={!currentTrack || segments.length === 0 || isExportingVideo}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-xl hover:from-purple-700 hover:to-pink-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-purple-500/25 flex items-center gap-2 font-medium"
                >
                  {isExportingVideo ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      {Math.round(exportProgress)}%
                    </>
                  ) : (
                    <>
                      <Film className="w-4 h-4" />
                      Export Video
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
          
          {/* Main content area with better layout */}
          <div className="flex flex-1 gap-6">
            {/* Left panel - Video and controls */}
            <div className="flex-1 flex flex-col">
              {currentProject?.videoUrl ? (
                <>
                  {/* Video player with modern styling */}
                  <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-gray-800 group">
                    <video
                      ref={videoRef}
                      src={currentProject.videoUrl}
                      onLoadedMetadata={handleVideoLoaded}
                      onTimeUpdate={handleTimeUpdate}
                      className="w-full h-auto"
                    />
                    
                    {/* Subtitle overlay with full styling */}
                    {isDraggableMode ? (
                      // Draggable subtitle mode
                      <div className="absolute inset-0">
                        {segments
                          .filter(seg => seg.startTime <= playbackTime && seg.endTime >= playbackTime)
                          .map(seg => {
                            const segmentStyle = { ...subtitleStyle, ...seg.style };
                            return (
                              <DraggableSubtitle
                                key={seg.id}
                                subtitle={{
                                  id: seg.id,
                                  startTime: seg.startTime,
                                  endTime: seg.endTime,
                                  text: seg.text,
                                  position: {
                                    x: 50,
                                    y: 85,
                                    alignment: 'center' as const,
                                    verticalAlignment: 'bottom' as const
                                  },
                                  style: {
                                    fontFamily: segmentStyle.fontFamily || 'Arial',
                                    fontSize: segmentStyle.fontSize || 24,
                                    fontWeight: (segmentStyle.fontWeight === 'bold' || segmentStyle.fontWeight === 700) ? 'bold' : 'normal',
                                    fontStyle: segmentStyle.fontStyle || 'normal',
                                    color: segmentStyle.fontColor || '#FFFFFF',
                                    backgroundColor: segmentStyle.backgroundColor,
                                    backgroundOpacity: segmentStyle.backgroundOpacity,
                                    strokeColor: '#000000',
                                    strokeWidth: segmentStyle.textStroke ? 2 : 0,
                                    shadowColor: '#000000',
                                    shadowBlur: segmentStyle.textShadow ? 3 : 0,
                                    padding: segmentStyle.padding
                                  }
                                }}
                                videoWidth={videoRef.current?.videoWidth || 1920}
                                videoHeight={videoRef.current?.videoHeight || 1080}
                                onUpdate={(updates) => {
                                  if (updates.style && activeTrackId) {
                                    updateSegment(activeTrackId, seg.id, {
                                      style: {
                                        ...seg.style,
                                        fontFamily: updates.style.fontFamily,
                                        fontSize: updates.style.fontSize,
                                        fontWeight: updates.style.fontWeight === 'bold' ? 'bold' : 'normal',
                                        fontStyle: updates.style.fontStyle,
                                        fontColor: updates.style.color,
                                        backgroundColor: updates.style.backgroundColor,
                                        backgroundOpacity: updates.style.backgroundOpacity,
                                        padding: updates.style.padding
                                      }
                                    });
                                  }
                                }}
                              />
                            );
                          })}
                      </div>
                    ) : (
                      // Static subtitle mode
                      segments
                        .filter(seg => seg.startTime <= playbackTime && seg.endTime >= playbackTime)
                        .map(seg => {
                          const segmentStyle = { ...subtitleStyle, ...seg.style };
                          const positionStyle = getSubtitlePosition(segmentStyle);
                          
                          return (
                            <div
                              key={seg.id}
                              className="absolute pointer-events-none"
                              style={{
                                ...positionStyle,
                                fontSize: `${segmentStyle.fontSize}px`,
                                fontFamily: segmentStyle.fontFamily,
                                fontWeight: segmentStyle.fontWeight,
                                fontStyle: segmentStyle.fontStyle,
                                color: segmentStyle.fontColor,
                                backgroundColor: segmentStyle.backgroundColor === 'transparent' 
                                  ? 'transparent' 
                                  : `${segmentStyle.backgroundColor}${Math.round((segmentStyle.backgroundOpacity || 1) * 255).toString(16).padStart(2, '0')}`,
                                padding: `${segmentStyle.padding}px`,
                                borderRadius: `${segmentStyle.borderRadius}px`,
                                textAlign: segmentStyle.alignment as any,
                                textShadow: segmentStyle.textShadow,
                                letterSpacing: `${segmentStyle.letterSpacing}px`,
                                lineHeight: segmentStyle.lineHeight,
                                ...(segmentStyle.textStroke ? { WebkitTextStroke: segmentStyle.textStroke } : {}),
                                maxWidth: '90%',
                                wordWrap: 'break-word'
                              }}
                            >
                              {seg.text}
                            </div>
                          );
                        })
                    )}
                    
                    {/* Video progress bar overlay */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-800/50 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                        style={{ width: `${(playbackTime / (videoRef.current?.duration || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                  
                  {/* Video controls with modern design */}
                  <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 mt-4 border border-gray-800">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={skipBackward}
                        className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                      >
                        <SkipBack className="w-5 h-5" />
                      </button>
                      <button
                        onClick={togglePlayPause}
                        className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-full hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-purple-500/25"
                      >
                        {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
                      </button>
                      <button
                        onClick={skipForward}
                        className="p-2.5 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                      >
                        <SkipForward className="w-5 h-5" />
                      </button>
                      
                      <div className="flex-1 px-4">
                        <div className="text-sm text-gray-400 font-mono">
                          {formatTime(playbackTime)} / {formatTime(videoRef.current?.duration || 0)}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Volume2 className="w-4 h-4 text-gray-400" />
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={volume}
                          onChange={handleVolumeChange}
                          className="w-24 accent-purple-500"
                        />
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center bg-gray-900/50 backdrop-blur rounded-2xl border-2 border-dashed border-gray-700">
                  <div className="text-center p-8">
                    <Upload className="w-16 h-16 mx-auto text-gray-600 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-300 mb-2">Upload a Video</h3>
                    <p className="text-gray-500 mb-4">Click the button above or drag and drop</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-purple-500/25 font-medium"
                    >
                      Choose Video File
                    </button>
                  </div>
                </div>
              )}
              
              {/* Transcription controls */}
              {currentProject?.videoUrl && (
                <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 mt-4 border border-gray-800">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-3">
                      <select
                        value={transcriptionMode}
                        onChange={(e) => setTranscriptionMode(e.target.value as 'whisper' | 'webspeech')}
                        className="px-4 py-2.5 bg-gray-800 text-gray-300 rounded-xl border border-gray-700 focus:border-purple-500 focus:outline-none transition-colors"
                      >
                        <option value="whisper">AI Transcription</option>
                        <option value="webspeech">Voice Recording</option>
                      </select>
                      
                      {transcriptionMode === 'whisper' && (
                        <select
                          value={selectedModel}
                          onChange={(e) => setSelectedModel(e.target.value)}
                          className="px-4 py-2.5 bg-gray-800 text-gray-300 rounded-xl border border-gray-700 focus:border-purple-500 focus:outline-none transition-colors"
                        >
                          {availableModels.map(model => (
                            <option key={model.id} value={model.id}>
                              {model.name} {model.downloaded && '✓'}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-3 ml-auto">
                      <button
                        onClick={() => setShowModelDownload(true)}
                        className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 text-gray-300 rounded-xl hover:bg-gray-700 hover:text-white transition-all duration-200 border border-gray-700"
                      >
                        <Download className="w-4 h-4" />
                        Models
                      </button>
                      
                      <button
                        onClick={isTranscribing || isRecording ? stopTranscription : startTranscription}
                        disabled={isTranscribing && transcriptionMode === 'whisper'}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl transition-all duration-200 font-medium shadow-lg ${
                          isTranscribing || isRecording
                            ? 'bg-red-600 hover:bg-red-700 text-white hover:shadow-red-500/25'
                            : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white hover:shadow-purple-500/25'
                        } disabled:opacity-40 disabled:cursor-not-allowed`}
                      >
                        {isTranscribing || isRecording ? (
                          <>
                            {isTranscribing && <Loader2 className="w-4 h-4 animate-spin" />}
                            {isRecording && <MicOff className="w-4 h-4" />}
                            Stop
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4" />
                            {transcriptionMode === 'webspeech' ? 'Record' : 'Transcribe'}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {/* Right panel - Subtitle timeline and editing */}
            <div className="w-[480px] flex flex-col">
              {/* Subtitle controls */}
              <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 mb-4 border border-gray-800">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">Subtitles</h3>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={addNewSegment}
                      disabled={!activeTrackId}
                      className="p-2 bg-green-600/20 text-green-400 rounded-lg hover:bg-green-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 border border-green-500/50"
                      title="Add subtitle"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    <button
                      onClick={deleteSelectedSegment}
                      disabled={!selectedSegmentId}
                      className="p-2 bg-red-600/20 text-red-400 rounded-lg hover:bg-red-600/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 border border-red-500/50"
                      title="Delete selected"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Subtitle list */}
                <div className="max-h-96 overflow-y-auto space-y-2 custom-scrollbar">
                  {segments.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p>No subtitles yet</p>
                      <p className="text-sm mt-1">Start transcription or add manually</p>
                    </div>
                  ) : (
                    segments.map((segment) => (
                      <div
                        key={segment.id}
                        onClick={() => handleSegmentClick(segment)}
                        className={`p-3 rounded-xl cursor-pointer transition-all duration-200 border ${
                          selectedSegmentId === segment.id
                            ? 'bg-purple-600/20 border-purple-500/50 shadow-lg shadow-purple-500/10'
                            : 'bg-gray-800/50 border-gray-700 hover:bg-gray-800 hover:border-gray-600'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            {editingSegmentId === segment.id ? (
                              <input
                                type="text"
                                value={segment.text}
                                onChange={(e) => {
                                  if (activeTrackId) {
                                    updateSegment(activeTrackId, segment.id, { text: e.target.value });
                                  }
                                }}
                                onBlur={() => setEditingSegmentId(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    setEditingSegmentId(null);
                                  }
                                }}
                                className="w-full px-2 py-1 bg-gray-700 text-white rounded border border-gray-600 focus:border-purple-500 focus:outline-none"
                                autoFocus
                              />
                            ) : (
                              <p className="text-gray-200 text-sm">{segment.text}</p>
                            )}
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-xs text-gray-500 font-mono">
                                {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
                              </span>
                              {segment.confidence && (
                                <span className="text-xs text-gray-500">
                                  {Math.round(segment.confidence * 100)}% confidence
                                </span>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSegmentId(segment.id);
                            }}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-all duration-200"
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
              
              {/* Style controls */}
              {showStyleControls && (
                <div className="bg-gray-900/80 backdrop-blur-xl rounded-2xl p-4 border border-gray-800">
                  <h3 className="text-lg font-semibold text-white mb-4">Subtitle Style</h3>
                  <SubtitleStyleControls />
                </div>
              )}
            </div>
          </div>
          
          {/* Export progress modal */}
          {isExportingVideo && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full border border-gray-800 shadow-2xl">
                <h3 className="text-xl font-semibold text-white mb-4">Exporting Video</h3>
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm text-gray-400 mb-2">
                    <span>Processing frames...</span>
                    <span>{Math.round(exportProgress)}%</span>
                  </div>
                  <div className="w-full bg-gray-800 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300 ease-out"
                      style={{ width: `${exportProgress}%` }}
                    />
                  </div>
                </div>
                <p className="text-gray-400 text-sm">This may take a few minutes depending on video length...</p>
              </div>
            </div>
          )}
          
          {/* Model download modal */}
          {showModelDownload && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
              <div className="bg-gray-900 rounded-2xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto border border-gray-800 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-semibold text-white">AI Models</h3>
                  <button
                    onClick={() => setShowModelDownload(false)}
                    className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all duration-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {availableModels.map(model => (
                    <div key={model.id} className="bg-gray-800/50 rounded-xl p-4 border border-gray-700">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-white">{model.name}</h4>
                          <p className="text-sm text-gray-400">{model.description}</p>
                          <p className="text-xs text-gray-500 mt-1">Size: {(model.size / 1024 / 1024).toFixed(0)}MB</p>
                        </div>
                        {model.downloaded ? (
                          <div className="flex items-center gap-2 text-green-400">
                            <Check className="w-5 h-5" />
                            <span className="text-sm">Downloaded</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleDownloadModel(model.id)}
                            disabled={modelDownloadProgress[model.id] !== undefined}
                            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
                          >
                            {modelDownloadProgress[model.id] !== undefined ? (
                              <span>{Math.round(modelDownloadProgress[model.id])}%</span>
                            ) : (
                              'Download'
                            )}
                          </button>
                        )}
                      </div>
                      {modelDownloadProgress[model.id] !== undefined && (
                        <div className="mt-3">
                          <div className="w-full bg-gray-700 rounded-full h-2 overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-purple-600 to-pink-600 transition-all duration-300"
                              style={{ width: `${modelDownloadProgress[model.id]}%` }}
                            />
                          </div>
                          <p className="text-xs text-gray-400 mt-1">{modelDownloadStatus[model.id]}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </main>
        
        <Footer />
      </div>
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(107, 114, 128, 0.5);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(156, 163, 175, 0.5);
        }
      `}</style>
    </div>
  );
};

export default SubtitlePageEnhanced; 