import React, { useRef, useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { useSubtitleStore } from '../../stores/subtitle-store';

interface VideoPreviewProps {
  videoUrl?: string;
  videoFile?: File;
  onTimeUpdate?: (time: number) => void;
  onDurationChange?: (duration: number) => void;
}

export const VideoPreview: React.FC<VideoPreviewProps> = ({
  videoUrl,
  videoFile,
  onTimeUpdate,
  onDurationChange
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [videoSrc, setVideoSrc] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const {
    playbackTime,
    isPlaying,
    setPlaybackTime,
    setIsPlaying,
    currentProject
  } = useSubtitleStore();

  // Set up video source
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setVideoSrc(url);
      return () => URL.revokeObjectURL(url);
    } else if (videoUrl) {
      setVideoSrc(videoUrl);
    }
  }, [videoFile, videoUrl]);

  // Handle video metadata
  const handleLoadedMetadata = useCallback(() => {
    if (!videoRef.current) return;
    
    setIsLoading(false);
    setError(null);
    
    const duration = videoRef.current.duration;
    onDurationChange?.(duration);
    
    // Update project duration
    if (currentProject) {
      currentProject.videoDuration = duration;
    }
  }, [onDurationChange, currentProject]);

  // Handle time updates
  const handleTimeUpdate = useCallback(() => {
    if (!videoRef.current) return;
    
    const currentTime = videoRef.current.currentTime;
    setPlaybackTime(currentTime);
    onTimeUpdate?.(currentTime);
  }, [setPlaybackTime, onTimeUpdate]);

  // Handle play/pause from store
  useEffect(() => {
    if (!videoRef.current) return;
    
    if (isPlaying) {
      videoRef.current.play().catch(err => {
        console.error('Failed to play video:', err);
        setIsPlaying(false);
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, setIsPlaying]);

  // Sync video time with store
  useEffect(() => {
    if (!videoRef.current || Math.abs(videoRef.current.currentTime - playbackTime) < 0.1) {
      return;
    }
    
    videoRef.current.currentTime = playbackTime;
  }, [playbackTime]);

  // Handle video errors
  const handleError = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    setIsLoading(false);
    setError('Failed to load video. Please check the file format is supported.');
    console.error('Video error:', e);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!videoRef.current) return;
      
      // Prevent shortcuts when typing
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      switch (e.code) {
        case 'Space':
          e.preventDefault();
          setIsPlaying(!isPlaying);
          break;
          
        case 'ArrowLeft':
          e.preventDefault();
          const newTimeLeft = Math.max(0, playbackTime - (e.shiftKey ? 10 : 5));
          setPlaybackTime(newTimeLeft);
          break;
          
        case 'ArrowRight':
          e.preventDefault();
          const newTimeRight = Math.min(
            videoRef.current.duration,
            playbackTime + (e.shiftKey ? 10 : 5)
          );
          setPlaybackTime(newTimeRight);
          break;
          
        case 'Home':
          e.preventDefault();
          setPlaybackTime(0);
          break;
          
        case 'End':
          e.preventDefault();
          setPlaybackTime(videoRef.current.duration);
          break;
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, playbackTime, setIsPlaying, setPlaybackTime]);

  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-gray-400">Loading video...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="flex flex-col items-center gap-4 max-w-md text-center">
            <span className="material-symbols-outlined text-4xl text-red-500">error</span>
            <p className="text-gray-400">{error}</p>
          </div>
        </div>
      )}
      
      {videoSrc && (
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-contain"
          onLoadedMetadata={handleLoadedMetadata}
          onTimeUpdate={handleTimeUpdate}
          onError={handleError}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
          controls={false}
        />
      )}
      
      {/* Playback Controls Overlay */}
      <motion.div
        className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="flex items-center gap-4">
          {/* Play/Pause Button */}
          <motion.button
            className="w-12 h-12 rounded-full bg-cyan-500 hover:bg-cyan-600 flex items-center justify-center transition-colors"
            onClick={() => setIsPlaying(!isPlaying)}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
          >
            <span className="material-symbols-outlined text-white">
              {isPlaying ? 'pause' : 'play_arrow'}
            </span>
          </motion.button>
          
          {/* Time Display */}
          <div className="text-white font-mono text-sm">
            {formatTime(playbackTime)} / {formatTime(videoRef.current?.duration || 0)}
          </div>
          
          {/* Skip Buttons */}
          <div className="flex items-center gap-2">
            <motion.button
              className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
              onClick={() => setPlaybackTime(Math.max(0, playbackTime - 5))}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Skip back 5s (←)"
            >
              <span className="material-symbols-outlined text-sm text-white">replay_5</span>
            </motion.button>
            
            <motion.button
              className="w-8 h-8 rounded bg-gray-700 hover:bg-gray-600 flex items-center justify-center transition-colors"
              onClick={() => setPlaybackTime(Math.min(videoRef.current?.duration || 0, playbackTime + 5))}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              title="Skip forward 5s (→)"
            >
              <span className="material-symbols-outlined text-sm text-white">forward_5</span>
            </motion.button>
          </div>
          
          {/* Speed Control */}
          <select
            className="bg-gray-700 text-white text-sm rounded px-2 py-1 outline-none focus:ring-2 focus:ring-cyan-500"
            onChange={(e) => {
              if (videoRef.current) {
                videoRef.current.playbackRate = parseFloat(e.target.value);
              }
            }}
            defaultValue="1"
          >
            <option value="0.25">0.25x</option>
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
      </motion.div>
      
      {/* Keyboard Shortcuts Hint */}
      <div className="absolute top-4 right-4 bg-black/60 rounded-lg p-2 text-xs text-gray-400">
        <div>Space: Play/Pause</div>
        <div>←/→: Skip 5s</div>
        <div>Shift + ←/→: Skip 10s</div>
      </div>
    </div>
  );
};

// Helper function to format time
function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '00:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
} 