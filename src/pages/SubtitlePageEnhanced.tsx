import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { VideoPreview } from '../components/subtitle/VideoPreview';
import { TranscriptionPanel } from '../components/subtitle/TranscriptionPanel';
import { SubtitleSegmentEditor } from '../components/subtitle/SubtitleSegmentEditor';
import { SubtitleTimeline } from '../components/subtitle/SubtitleTimeline';
import { SubtitleStyleControls } from '../components/subtitle/SubtitleStyleControls';
import ResizableVideoContainer from '../components/subtitle/ResizableVideoContainer';
import WhisperModelManager from '../components/subtitle/WhisperModelManager';
import { useSubtitleStore } from '../stores/subtitle-store';
import { useSubtitleKeyboardShortcuts } from '../hooks/useSubtitleKeyboardShortcuts';
import { useAutoSave } from '../hooks/useAutoSave';
import { SubtitleSegment, SubtitleStyle } from '../types/subtitle';
import { exportToSRT, exportToWebVTT } from '../lib/subtitle-utils';

const SubtitlePageEnhanced: React.FC = () => {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State management
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState<string>('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [exportFormat, setExportFormat] = useState<'srt' | 'vtt'>('srt');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [showTimeline, setShowTimeline] = useState(true);
  
  // Subtitle store
  const {
    currentProject,
    createProject,
    addTrack,
    addSegment,
    updateSegment,
    deleteSegment,
    setActiveTrack,
    updateTrackStyle,
    selectedSegmentIds,
    selectSegment,
    clearSelection,
    playbackTime,
    setPlaybackTime,
    isPlaying: storeIsPlaying,
    setIsPlaying: setStoreIsPlaying,
    selectedModel,
    setSelectedModel
  } = useSubtitleStore();

  // Get active track and its segments
  const activeTrack = currentProject?.tracks.find(t => t.id === currentProject.activeTrackId);
  const subtitles = activeTrack?.segments || [];
  const subtitleStyle = activeTrack?.style || {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    color: '#ffffff',
    fontFamily: 'Arial, sans-serif',
    fontSize: 18,
    fontWeight: 'normal' as const,
    fontStyle: 'normal' as const,
    shadowColor: undefined,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    shadowBlur: 0,
    strokeWidth: 0,
    strokeColor: '#000000'
  };

  // Auto-save hook
  useAutoSave({ enabled: true, interval: 30 });

  // Keyboard shortcuts
  useSubtitleKeyboardShortcuts();

  // Get current subtitle based on video time
  const currentSubtitle = subtitles.find(
    sub => currentTime >= sub.startTime && currentTime <= sub.endTime
  );

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      const url = URL.createObjectURL(file);
      setVideoUrl(url);
      
      // Create new project with default track
      const projectName = file.name.replace(/\.[^/.]+$/, '');
      createProject(projectName, url, file);
      addTrack('Default', 'en');
    }
  };

  // Handle video metadata
  const handleLoadedMetadata = () => {
    if (videoRef.current && currentProject) {
      const videoDuration = videoRef.current.duration;
      setDuration(videoDuration);
      currentProject.videoDuration = videoDuration;
    }
  };

  // Handle time update
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      const time = videoRef.current.currentTime;
      setCurrentTime(time);
      setPlaybackTime(time);
    }
  };

  // Handle seek
  const handleSeek = (time: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
      setPlaybackTime(time);
    }
  };

  // Handle transcription complete
  const handleTranscriptionComplete = () => {
    // Transcription panel handles adding segments directly
  };

  // Handle subtitle click
  const handleSubtitleClick = (subtitle: SubtitleSegment) => {
    selectSegment(subtitle.id);
    handleSeek(subtitle.startTime);
  };

  // Handle subtitle update
  const handleSubtitleUpdate = (id: string, updates: Partial<SubtitleSegment>) => {
    if (activeTrack) {
      updateSegment(activeTrack.id, id, updates);
    }
  };

  // Handle subtitle add
  const handleAddSubtitle = () => {
    if (!activeTrack) return;
    
    const newSegment: Omit<SubtitleSegment, 'id'> = {
      startTime: currentTime,
      endTime: currentTime + 2,
      text: 'New subtitle'
    };
    
    addSegment(activeTrack.id, newSegment);
  };

  // Handle delete
  const handleDeleteSubtitle = (id: string) => {
    if (activeTrack) {
      deleteSegment(activeTrack.id, id);
      if (selectedSegmentIds.includes(id)) {
        clearSelection();
      }
    }
  };

  // Handle export
  const handleExport = () => {
    if (subtitles.length === 0) return;

    const fileName = videoFile ? videoFile.name.replace(/\.[^/.]+$/, '') : 'subtitles';
    let content: string;
    let mimeType: string;
    let extension: string;

    if (exportFormat === 'srt') {
      content = exportToSRT(subtitles);
      mimeType = 'text/plain';
      extension = 'srt';
    } else {
      content = exportToWebVTT(subtitles);
      mimeType = 'text/vtt';
      extension = 'vtt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${fileName}.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
    setShowExportMenu(false);
  };

  // Handle style update
  const handleStyleUpdate = (style: Partial<SubtitleStyle>) => {
    if (activeTrack) {
      updateTrackStyle(activeTrack.id, style);
    }
  };

  // Update playing state
  useEffect(() => {
    setStoreIsPlaying(isPlaying);
  }, [isPlaying, setStoreIsPlaying]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  return (
    <div className="min-h-screen bg-gray-950 text-white overflow-hidden">
      {/* Enhanced Header */}
      <motion.div 
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="bg-gradient-to-b from-gray-900 to-gray-950 border-b border-gray-800 px-6 py-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <motion.button
              onClick={() => navigate('/')}
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              whileHover={{ x: -5 }}
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span>Back</span>
            </motion.button>
            
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                Video Caption Studio
              </h1>
              {currentProject && (
                <p className="text-sm text-gray-500 mt-1">{currentProject.name}</p>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Model Manager */}
            <WhisperModelManager
              selectedModel={selectedModel}
              onModelSelect={setSelectedModel}
            />
            
            {/* Load Video Button */}
            <motion.button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg transition-all flex items-center space-x-2 shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="material-symbols-outlined">upload</span>
              <span>Load Video</span>
            </motion.button>
            
            {/* Export Menu */}
            {subtitles.length > 0 && (
              <div className="relative">
                <motion.button
                  onClick={() => setShowExportMenu(!showExportMenu)}
                  className="px-4 py-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 rounded-lg transition-all flex items-center space-x-2 shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <span className="material-symbols-outlined">download</span>
                  <span>Export</span>
                  <span className="material-symbols-outlined text-sm">
                    {showExportMenu ? 'expand_less' : 'expand_more'}
                  </span>
                </motion.button>
                
                <AnimatePresence>
                  {showExportMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 overflow-hidden"
                    >
                      <div className="p-2">
                        <button
                          onClick={() => {
                            setExportFormat('srt');
                            handleExport();
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-700 rounded transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span>Export as SRT</span>
                            <span className="text-xs text-gray-500">.srt</span>
                          </div>
                        </button>
                        <button
                          onClick={() => {
                            setExportFormat('vtt');
                            handleExport();
                          }}
                          className="w-full px-3 py-2 text-left hover:bg-gray-700 rounded transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span>Export as WebVTT</span>
                            <span className="text-xs text-gray-500">.vtt</span>
                          </div>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Main Content */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Video and Controls */}
        <motion.div 
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex-1 p-6 flex flex-col bg-gradient-to-br from-gray-900 to-gray-950"
        >
          {/* Video Container */}
          <div className="flex-1 flex items-center justify-center mb-4">
            {videoUrl ? (
              <ResizableVideoContainer>
                <div className="relative w-full h-full">
                  <VideoPreview
                    videoUrl={videoUrl}
                    videoFile={videoFile || undefined}
                    onTimeUpdate={handleTimeUpdate}
                    onDurationChange={(dur) => setDuration(dur)}
                  />
                  
                  {/* Enhanced Subtitle Overlay */}
                  <AnimatePresence>
                    {currentSubtitle && (
                      <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        className="absolute bottom-10 left-0 right-0 flex justify-center px-4"
                      >
                        <div 
                          className="px-8 py-4 rounded-xl backdrop-blur-md shadow-2xl"
                          style={{
                            backgroundColor: subtitleStyle.backgroundColor || 'rgba(0, 0, 0, 0.8)',
                            color: subtitleStyle.color || '#ffffff',
                            fontFamily: subtitleStyle.fontFamily || 'Arial, sans-serif',
                            fontSize: `${subtitleStyle.fontSize || 18}px`,
                            fontWeight: subtitleStyle.fontWeight || 'normal',
                            fontStyle: subtitleStyle.fontStyle || 'normal',
                            textShadow: subtitleStyle.shadowColor
                              ? `${subtitleStyle.shadowOffsetX || 0}px ${subtitleStyle.shadowOffsetY || 0}px ${subtitleStyle.shadowBlur || 0}px ${subtitleStyle.shadowColor}`
                              : 'none',
                            WebkitTextStroke: subtitleStyle.strokeWidth 
                              ? `${subtitleStyle.strokeWidth}px ${subtitleStyle.strokeColor || '#000000'}`
                              : 'none',
                          }}
                        >
                          <p className="text-center max-w-3xl">{currentSubtitle.text}</p>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ResizableVideoContainer>
            ) : (
              <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="flex flex-col items-center justify-center p-12 bg-gray-900/50 rounded-2xl border-2 border-dashed border-gray-700"
              >
                <span className="material-symbols-outlined text-8xl text-gray-600 mb-6">
                  video_file
                </span>
                <p className="text-xl text-gray-400 mb-2">No video loaded</p>
                <p className="text-sm text-gray-500 mb-6">Select a video file to start editing subtitles</p>
                <motion.button
                  onClick={() => fileInputRef.current?.click()}
                  className="px-6 py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 rounded-lg transition-all shadow-lg"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Select Video File
                </motion.button>
              </motion.div>
            )}
          </div>

          {/* Timeline Toggle */}
          <motion.button
            onClick={() => setShowTimeline(!showTimeline)}
            className="mb-2 px-3 py-1 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors flex items-center space-x-2 self-start"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <span className="material-symbols-outlined text-sm">
              {showTimeline ? 'visibility' : 'visibility_off'}
            </span>
            <span>Timeline</span>
          </motion.button>

          {/* Timeline */}
          <AnimatePresence>
            {showTimeline && videoUrl && activeTrack && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="mb-4"
              >
                <SubtitleTimeline
                  duration={duration}
                  onSegmentClick={handleSubtitleClick}
                />
              </motion.div>
            )}
          </AnimatePresence>

          {/* Transcription Panel */}
          {videoUrl && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <TranscriptionPanel
                onTranscriptionComplete={handleTranscriptionComplete}
              />
            </motion.div>
          )}
        </motion.div>

        {/* Right Panel - Subtitle Editor and Style Controls */}
        <motion.div 
          initial={{ x: 20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="w-[480px] bg-gray-900 border-l border-gray-800 flex flex-col"
        >
          {/* Subtitle Editor Header */}
          <div className="p-6 border-b border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Subtitles</h3>
              <motion.button
                onClick={handleAddSubtitle}
                disabled={!videoUrl || !activeTrack}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-700 hover:to-blue-700 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed rounded-lg transition-all flex items-center space-x-2 shadow-md"
                whileHover={videoUrl && activeTrack ? { scale: 1.05 } : {}}
                whileTap={videoUrl && activeTrack ? { scale: 0.95 } : {}}
              >
                <span className="material-symbols-outlined text-sm">add</span>
                <span>Add Subtitle</span>
              </motion.button>
            </div>
            <div className="text-sm text-gray-500">
              {subtitles.length} subtitle{subtitles.length !== 1 ? 's' : ''} • 
              {selectedSegmentIds.length > 0 && ` ${selectedSegmentIds.length} selected`}
            </div>
          </div>

          {/* Subtitle List */}
          <div className="flex-1 overflow-y-auto p-6">
            <AnimatePresence>
              {subtitles.length > 0 ? (
                <div className="space-y-3">
                  {subtitles.map((subtitle, index) => (
                    <motion.div
                      key={subtitle.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      {activeTrack && (
                        <SubtitleSegmentEditor
                          trackId={activeTrack.id}
                          segment={subtitle}
                          onClose={() => clearSelection()}
                        />
                      )}
                    </motion.div>
                  ))}
                </div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-center py-12"
                >
                  <span className="material-symbols-outlined text-6xl text-gray-700 mb-4">
                    subtitles_off
                  </span>
                  <p className="text-gray-400">No subtitles yet</p>
                  <p className="text-sm text-gray-500 mt-2">
                    Use AI transcription or add manually
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Style Controls */}
          {activeTrack && (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="border-t border-gray-800 p-6"
            >
              <SubtitleStyleControls
                trackId={activeTrack.id}
              />
            </motion.div>
          )}
        </motion.div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default SubtitlePageEnhanced; 