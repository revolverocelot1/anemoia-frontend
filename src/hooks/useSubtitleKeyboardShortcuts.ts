import { useEffect, useCallback } from 'react';
import { useSubtitleStore } from '../stores/subtitle-store';
import { createSubtitleAtTime } from '../lib/subtitle-utils';

interface ShortcutOptions {
  enabled?: boolean;
  onSave?: () => void;
  onExport?: () => void;
  onTogglePlay?: () => void;
}

export const useSubtitleKeyboardShortcuts = (options: ShortcutOptions = {}) => {
  const { enabled = true } = options;
  
  const {
    currentProject,
    playbackTime,
    isPlaying,
    selectedSegmentIds,
    setIsPlaying,
    setPlaybackTime,
    addSegment,
    deleteSegment,
    mergeSegments,
    splitSegment,
    selectSegment,
    clearSelection,
    setZoomLevel,
    zoomLevel
  } = useSubtitleStore();
  
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return;
    
    // Don't handle shortcuts when typing in inputs
    const target = e.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.contentEditable === 'true') {
      return;
    }
    
    const activeTrack = currentProject?.tracks.find(t => t.id === currentProject.activeTrackId);
    
    // Playback controls
    if (e.code === 'Space' && !e.ctrlKey && !e.metaKey) {
      e.preventDefault();
      setIsPlaying(!isPlaying);
      options.onTogglePlay?.();
      return;
    }
    
    // Timeline navigation
    if (e.code === 'ArrowLeft' && !e.ctrlKey) {
      e.preventDefault();
      const jump = e.shiftKey ? 10 : e.altKey ? 1 : 5;
      setPlaybackTime(Math.max(0, playbackTime - jump));
      return;
    }
    
    if (e.code === 'ArrowRight' && !e.ctrlKey) {
      e.preventDefault();
      const jump = e.shiftKey ? 10 : e.altKey ? 1 : 5;
      const duration = currentProject?.videoDuration || 0;
      setPlaybackTime(Math.min(duration, playbackTime + jump));
      return;
    }
    
    // Jump to start/end
    if (e.code === 'Home') {
      e.preventDefault();
      setPlaybackTime(0);
      return;
    }
    
    if (e.code === 'End') {
      e.preventDefault();
      setPlaybackTime(currentProject?.videoDuration || 0);
      return;
    }
    
    // Subtitle creation
    if (e.code === 'KeyN' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (activeTrack) {
        const newSegment = createSubtitleAtTime(playbackTime, 2);
        addSegment(activeTrack.id, newSegment);
      }
      return;
    }
    
    // Delete selected segments
    if ((e.code === 'Delete' || e.code === 'Backspace') && selectedSegmentIds.length > 0) {
      e.preventDefault();
      if (activeTrack && window.confirm(`Delete ${selectedSegmentIds.length} subtitle(s)?`)) {
        selectedSegmentIds.forEach(segmentId => {
          deleteSegment(activeTrack.id, segmentId);
        });
        clearSelection();
      }
      return;
    }
    
    // Merge selected segments
    if (e.code === 'KeyM' && (e.ctrlKey || e.metaKey) && selectedSegmentIds.length > 1) {
      e.preventDefault();
      if (activeTrack) {
        mergeSegments(activeTrack.id, selectedSegmentIds);
        clearSelection();
      }
      return;
    }
    
    // Split segment at playback position
    if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey) && e.shiftKey) {
      e.preventDefault();
      if (activeTrack && selectedSegmentIds.length === 1) {
        const segment = activeTrack.segments.find(s => s.id === selectedSegmentIds[0]);
        if (segment && playbackTime > segment.startTime && playbackTime < segment.endTime) {
          splitSegment(activeTrack.id, segment.id, playbackTime);
        }
      }
      return;
    }
    
    // Select all
    if (e.code === 'KeyA' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      if (activeTrack) {
        activeTrack.segments.forEach(segment => {
          selectSegment(segment.id, true);
        });
      }
      return;
    }
    
    // Clear selection
    if (e.code === 'Escape') {
      e.preventDefault();
      clearSelection();
      return;
    }
    
    // Save project
    if (e.code === 'KeyS' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
      e.preventDefault();
      options.onSave?.();
      return;
    }
    
    // Export
    if (e.code === 'KeyE' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      options.onExport?.();
      return;
    }
    
    // Zoom controls
    if (e.code === 'Equal' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setZoomLevel(Math.min(10, zoomLevel + 0.1));
      return;
    }
    
    if (e.code === 'Minus' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setZoomLevel(Math.max(0.1, zoomLevel - 0.1));
      return;
    }
    
    if (e.code === 'Digit0' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      setZoomLevel(1);
      return;
    }
    
    // Jump to next/previous segment
    if (e.code === 'Tab' && activeTrack) {
      e.preventDefault();
      const sortedSegments = [...activeTrack.segments].sort((a, b) => a.startTime - b.startTime);
      
      if (e.shiftKey) {
        // Previous segment
        const prevSegment = sortedSegments
          .reverse()
          .find(s => s.startTime < playbackTime - 0.1);
        
        if (prevSegment) {
          setPlaybackTime(prevSegment.startTime);
          clearSelection();
          selectSegment(prevSegment.id);
        }
      } else {
        // Next segment
        const nextSegment = sortedSegments
          .find(s => s.startTime > playbackTime + 0.1);
        
        if (nextSegment) {
          setPlaybackTime(nextSegment.startTime);
          clearSelection();
          selectSegment(nextSegment.id);
        }
      }
      return;
    }
  }, [
    enabled,
    currentProject,
    playbackTime,
    isPlaying,
    selectedSegmentIds,
    zoomLevel,
    setIsPlaying,
    setPlaybackTime,
    addSegment,
    deleteSegment,
    mergeSegments,
    splitSegment,
    selectSegment,
    clearSelection,
    setZoomLevel,
    options
  ]);
  
  useEffect(() => {
    if (enabled) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [enabled, handleKeyDown]);
  
  return {
    shortcuts: [
      { key: 'Space', description: 'Play/Pause' },
      { key: '←/→', description: 'Skip 5s (Shift: 10s, Alt: 1s)' },
      { key: 'Home/End', description: 'Jump to start/end' },
      { key: 'Ctrl+N', description: 'New subtitle at current time' },
      { key: 'Delete', description: 'Delete selected subtitles' },
      { key: 'Ctrl+M', description: 'Merge selected subtitles' },
      { key: 'Ctrl+Shift+S', description: 'Split subtitle at playhead' },
      { key: 'Ctrl+A', description: 'Select all subtitles' },
      { key: 'Escape', description: 'Clear selection' },
      { key: 'Tab', description: 'Next subtitle (Shift: Previous)' },
      { key: 'Ctrl+S', description: 'Save project' },
      { key: 'Ctrl+E', description: 'Export' },
      { key: 'Ctrl +/-', description: 'Zoom in/out' },
      { key: 'Ctrl+0', description: 'Reset zoom' }
    ]
  };
};

export default useSubtitleKeyboardShortcuts; 