import React, { forwardRef, useEffect, useRef, useImperativeHandle, useState } from 'react';
import { Play, Pause, Volume2, VolumeX, Maximize, SkipBack, SkipForward, AlertCircle, Loader } from 'lucide-react';

interface VideoPlayerProps {
  src: string;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onPlayPause: (isPlaying: boolean) => void;
  className?: string;
}

const VideoPlayer = forwardRef<HTMLVideoElement, VideoPlayerProps>(({
  src,
  onTimeUpdate,
  onDurationChange,
  onPlayPause,
  className = ''
}, ref) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [showControls, setShowControls] = useState(true);
  const [videoState, setVideoState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const controlsTimeoutRef = useRef<NodeJS.Timeout>();

  // Expose video element through ref
  useImperativeHandle(ref, () => videoRef.current!);

  // Handle video metadata and loading states
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setVideoState('loading');
    setErrorMessage('');

    const handleLoadedMetadata = () => {
      console.log('[VideoPlayer] Metadata loaded:', {
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight
      });
      setDuration(video.duration);
      onDurationChange(video.duration);
      setVideoState('ready');
    };

    const handleCanPlay = () => {
      console.log('[VideoPlayer] Video can play');
      setVideoState('ready');
    };

    const handleError = (e: Event) => {
      console.error('[VideoPlayer] Video error:', e);
      const video = e.target as HTMLVideoElement;
      let errorMsg = 'Failed to load video';
      
      if (video.error) {
        switch (video.error.code) {
          case 1:
            errorMsg = 'Video loading aborted';
            break;
          case 2:
            errorMsg = 'Network error while loading video';
            break;
          case 3:
            errorMsg = 'Video format not supported';
            break;
          case 4:
            errorMsg = 'Video source not found or corrupt';
            break;
        }
      }
      
      setErrorMessage(errorMsg);
      setVideoState('error');
    };

    const handleTimeUpdate = () => {
      // Throttle time updates to reduce choppy preview
      const newTime = video.currentTime;
      if (Math.abs(newTime - currentTime) > 0.1) {
        setCurrentTime(newTime);
        onTimeUpdate(newTime);
      }
    };

    const handlePlay = () => {
      setIsPlaying(true);
      onPlayPause(true);
    };

    const handlePause = () => {
      setIsPlaying(false);
      onPlayPause(false);
    };

    // Add event listeners
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);

    // Force reload the video source
    video.load();

    return () => {
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
    };
  }, [src, onTimeUpdate, onDurationChange, onPlayPause]);

  // Play/Pause toggle
  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  // Mute toggle
  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !video.muted;
    setIsMuted(video.muted);
  };

  // Volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newVolume = parseFloat(e.target.value);
    video.volume = newVolume;
    setVolume(newVolume);
    setIsMuted(newVolume === 0);
  };

  // Seek
  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;

    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Skip forward/backward
  const skip = (seconds: number) => {
    const video = videoRef.current;
    if (!video) return;

    video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
  };

  // Fullscreen
  const toggleFullscreen = () => {
    const container = videoRef.current?.parentElement;
    if (!container) return;

    if (!document.fullscreenElement) {
      container.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Show/hide controls
  const handleMouseMove = () => {
    setShowControls(true);
    
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  // Format time
  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className={`relative bg-black ${className}`}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
    >
      {/* Loading indicator */}
      {videoState === 'loading' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center">
            <Loader className="w-12 h-12 text-purple-500 animate-spin mx-auto mb-4" />
            <p className="text-white">Loading video...</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {videoState === 'error' && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10">
          <div className="text-center max-w-md px-4">
            <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <p className="text-white text-lg mb-2">Video Error</p>
            <p className="text-gray-400">{errorMessage}</p>
            <p className="text-sm text-gray-500 mt-4">Try uploading a different video format (MP4, WebM, or MOV)</p>
          </div>
        </div>
      )}

      <video
        ref={videoRef}
        src={src}
        className="w-full h-full"
        onClick={togglePlayPause}
        preload="metadata"
        crossOrigin="anonymous"
        playsInline
      />

      {/* Controls overlay - Only show when video is ready */}
      {videoState === 'ready' && (
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
            showControls ? 'opacity-100' : 'opacity-0'
          }`}
        >
          {/* Progress bar */}
          <div className="mb-4">
            <input
              type="range"
              min="0"
              max={duration || 0}
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer slider"
              style={{
                background: `linear-gradient(to right, #9333ea ${(currentTime / duration) * 100}%, #4b5563 ${(currentTime / duration) * 100}%)`
              }}
            />
          </div>

          {/* Control buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {/* Play/Pause */}
              <button
                onClick={togglePlayPause}
                className="text-white hover:text-purple-400 transition-colors"
              >
                {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
              </button>

              {/* Skip backward */}
              <button
                onClick={() => skip(-10)}
                className="text-white hover:text-purple-400 transition-colors"
              >
                <SkipBack className="w-5 h-5" />
              </button>

              {/* Skip forward */}
              <button
                onClick={() => skip(10)}
                className="text-white hover:text-purple-400 transition-colors"
              >
                <SkipForward className="w-5 h-5" />
              </button>

              {/* Volume */}
              <div className="flex items-center gap-2">
                <button
                  onClick={toggleMute}
                  className="text-white hover:text-purple-400 transition-colors"
                >
                  {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Time display */}
              <div className="text-white text-sm">
                {formatTime(currentTime)} / {formatTime(duration)}
              </div>
            </div>

            {/* Fullscreen */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-purple-400 transition-colors"
            >
              <Maximize className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Custom styles for range inputs */}
      <style dangerouslySetInnerHTML={{ __html: `
        input[type="range"]::-webkit-slider-thumb {
          appearance: none;
          width: 12px;
          height: 12px;
          background: #9333ea;
          border-radius: 50%;
          cursor: pointer;
        }
        
        input[type="range"]::-moz-range-thumb {
          width: 12px;
          height: 12px;
          background: #9333ea;
          border-radius: 50%;
          cursor: pointer;
          border: none;
        }
      `}} />
    </div>
  );
});

VideoPlayer.displayName = 'VideoPlayer';

export default VideoPlayer; 