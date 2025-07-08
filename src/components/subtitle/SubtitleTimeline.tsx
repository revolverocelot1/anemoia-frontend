import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSubtitleStore } from '../../stores/subtitle-store';
import type { SubtitleSegment, SubtitleTrack } from '../../types/subtitle';

interface SubtitleTimelineProps {
  duration: number;
  onSegmentClick?: (segment: SubtitleSegment) => void;
}

export const SubtitleTimeline: React.FC<SubtitleTimelineProps> = ({
  duration,
  onSegmentClick
}) => {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [timelineWidth, setTimelineWidth] = useState(0);
  const [hoveredSegment, setHoveredSegment] = useState<string | null>(null);
  const [draggedSegment, setDraggedSegment] = useState<{
    trackId: string;
    segmentId: string;
    edge: 'start' | 'end' | 'both';
    initialX: number;
    initialStartTime: number;
    initialEndTime: number;
  } | null>(null);
  
  const {
    currentProject,
    playbackTime,
    zoomLevel,
    scrollPosition,
    selectedSegmentIds,
    selectSegment,
    updateSegment,
    setPlaybackTime,
    setScrollPosition
  } = useSubtitleStore();
  
  // Update timeline width
  useEffect(() => {
    const updateWidth = () => {
      if (timelineRef.current) {
        setTimelineWidth(timelineRef.current.clientWidth);
      }
    };
    
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);
  
  // Convert time to pixel position
  const timeToPixel = (time: number): number => {
    return (time / duration) * timelineWidth * zoomLevel - scrollPosition;
  };
  
  // Convert pixel position to time
  const pixelToTime = (pixel: number): number => {
    return ((pixel + scrollPosition) / (timelineWidth * zoomLevel)) * duration;
  };
  
  // Handle segment drag
  const handleSegmentDrag = useCallback((e: MouseEvent) => {
    if (!draggedSegment || !timelineRef.current) return;
    
    const rect = timelineRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const deltaX = x - draggedSegment.initialX;
    const deltaTime = pixelToTime(x) - pixelToTime(draggedSegment.initialX);
    
    let newStartTime = draggedSegment.initialStartTime;
    let newEndTime = draggedSegment.initialEndTime;
    
    if (draggedSegment.edge === 'start') {
      newStartTime = Math.max(0, Math.min(draggedSegment.initialEndTime - 0.1, draggedSegment.initialStartTime + deltaTime));
    } else if (draggedSegment.edge === 'end') {
      newEndTime = Math.min(duration, Math.max(draggedSegment.initialStartTime + 0.1, draggedSegment.initialEndTime + deltaTime));
    } else {
      // Moving entire segment
      const segmentDuration = draggedSegment.initialEndTime - draggedSegment.initialStartTime;
      newStartTime = Math.max(0, Math.min(duration - segmentDuration, draggedSegment.initialStartTime + deltaTime));
      newEndTime = newStartTime + segmentDuration;
    }
    
    updateSegment(draggedSegment.trackId, draggedSegment.segmentId, {
      startTime: newStartTime,
      endTime: newEndTime
    });
  }, [draggedSegment, duration, pixelToTime, updateSegment]);
  
  // Handle drag end
  const handleDragEnd = useCallback(() => {
    setDraggedSegment(null);
  }, []);
  
  // Add drag event listeners
  useEffect(() => {
    if (draggedSegment) {
      window.addEventListener('mousemove', handleSegmentDrag);
      window.addEventListener('mouseup', handleDragEnd);
      return () => {
        window.removeEventListener('mousemove', handleSegmentDrag);
        window.removeEventListener('mouseup', handleDragEnd);
      };
    }
  }, [draggedSegment, handleSegmentDrag, handleDragEnd]);
  
  // Handle timeline click
  const handleTimelineClick = (e: React.MouseEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return;
    
    const x = e.clientX - rect.left;
    const time = pixelToTime(x);
    setPlaybackTime(Math.max(0, Math.min(duration, time)));
  };
  
  // Render time markers
  const renderTimeMarkers = () => {
    const markers = [];
    const markerInterval = Math.ceil(duration / 10 / zoomLevel) * zoomLevel;
    
    for (let time = 0; time <= duration; time += markerInterval) {
      const x = timeToPixel(time);
      if (x >= -50 && x <= timelineWidth + 50) {
        markers.push(
          <div
            key={time}
            className="absolute flex flex-col items-center"
            style={{ left: x }}
          >
            <div className="h-full w-px bg-gray-600" />
            <span className="absolute -top-5 text-xs text-gray-400 font-mono">
              {formatTime(time)}
            </span>
          </div>
        );
      }
    }
    
    return markers;
  };
  
  // Render segment
  const renderSegment = (track: SubtitleTrack, segment: SubtitleSegment) => {
    const startX = timeToPixel(segment.startTime);
    const endX = timeToPixel(segment.endTime);
    const width = endX - startX;
    
    if (endX < -50 || startX > timelineWidth + 50) {
      return null; // Outside viewport
    }
    
    const isSelected = selectedSegmentIds.includes(segment.id);
    const isHovered = hoveredSegment === segment.id;
    
    return (
      <motion.div
        key={segment.id}
        className={`absolute h-12 rounded cursor-pointer ${
          isSelected ? 'ring-2 ring-cyan-500' : ''
        }`}
        style={{
          left: Math.max(0, startX),
          width: Math.max(20, width),
          backgroundColor: track.style.backgroundColor || '#333',
          borderColor: track.style.color,
          borderWidth: 1,
          borderStyle: 'solid',
        }}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileHover={{ scale: 1.02 }}
        onClick={(e) => {
          e.stopPropagation();
          selectSegment(segment.id, e.shiftKey || e.ctrlKey || e.metaKey);
          onSegmentClick?.(segment);
        }}
        onMouseEnter={() => setHoveredSegment(segment.id)}
        onMouseLeave={() => setHoveredSegment(null)}
      >
        {/* Segment content */}
        <div className="absolute inset-0 p-1 overflow-hidden">
          <p className="text-xs text-white truncate">{segment.text}</p>
          <p className="text-xs text-gray-400">
            {formatTime(segment.startTime)} - {formatTime(segment.endTime)}
          </p>
        </div>
        
        {/* Resize handles */}
        <div
          className="absolute left-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-cyan-500/50"
          onMouseDown={(e) => {
            e.stopPropagation();
            setDraggedSegment({
              trackId: track.id,
              segmentId: segment.id,
              edge: 'start',
              initialX: e.clientX - timelineRef.current!.getBoundingClientRect().left,
              initialStartTime: segment.startTime,
              initialEndTime: segment.endTime
            });
          }}
        />
        <div
          className="absolute right-0 top-0 bottom-0 w-2 cursor-ew-resize hover:bg-cyan-500/50"
          onMouseDown={(e) => {
            e.stopPropagation();
            setDraggedSegment({
              trackId: track.id,
              segmentId: segment.id,
              edge: 'end',
              initialX: e.clientX - timelineRef.current!.getBoundingClientRect().left,
              initialStartTime: segment.startTime,
              initialEndTime: segment.endTime
            });
          }}
        />
        
        {/* Hover tooltip */}
        {isHovered && (
          <motion.div
            className="absolute -top-16 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded px-2 py-1 text-xs whitespace-nowrap z-50"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <p className="font-medium">{segment.text}</p>
            <p className="text-gray-400">
              Duration: {formatTime(segment.endTime - segment.startTime)}
            </p>
            {segment.confidence && (
              <p className="text-gray-400">
                Confidence: {(segment.confidence * 100).toFixed(1)}%
              </p>
            )}
          </motion.div>
        )}
      </motion.div>
    );
  };
  
  if (!currentProject || !timelineWidth) {
    return (
      <div className="flex items-center justify-center h-full text-gray-500">
        <p>No project loaded</p>
      </div>
    );
  }
  
  return (
    <div className="relative h-full bg-gray-900 rounded-lg overflow-hidden">
      {/* Timeline header */}
      <div className="absolute top-0 left-0 right-0 h-8 bg-gray-800 border-b border-gray-700 z-20">
        <div className="flex items-center justify-between h-full px-4">
          <span className="text-sm text-gray-400">Timeline</span>
          <div className="flex items-center gap-2">
            {/* Zoom controls */}
            <button
              className="p-1 rounded hover:bg-gray-700 transition-colors"
              onClick={() => useSubtitleStore.getState().setZoomLevel(Math.max(0.1, zoomLevel - 0.1))}
              title="Zoom out"
            >
              <span className="material-symbols-outlined text-sm">zoom_out</span>
            </button>
            <span className="text-xs text-gray-400 w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              className="p-1 rounded hover:bg-gray-700 transition-colors"
              onClick={() => useSubtitleStore.getState().setZoomLevel(Math.min(10, zoomLevel + 0.1))}
              title="Zoom in"
            >
              <span className="material-symbols-outlined text-sm">zoom_in</span>
            </button>
          </div>
        </div>
      </div>
      
      {/* Timeline content */}
      <div
        ref={timelineRef}
        className="absolute top-8 left-0 right-0 bottom-0 overflow-x-auto overflow-y-hidden"
        onClick={handleTimelineClick}
        onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
      >
        {/* Time markers */}
        <div className="absolute top-0 left-0 right-0 h-6 border-b border-gray-700">
          {renderTimeMarkers()}
        </div>
        
        {/* Tracks */}
        <div className="absolute top-6 left-0 right-0 bottom-0">
          {currentProject.tracks.map((track, index) => (
            <div
              key={track.id}
              className="relative h-16 border-b border-gray-700"
              style={{ top: index * 64 }}
            >
              {/* Track header */}
              <div className="absolute left-0 top-0 bottom-0 w-32 bg-gray-800 border-r border-gray-700 flex items-center px-2 z-10">
                <span className="text-sm text-gray-300 truncate">{track.name}</span>
              </div>
              
              {/* Track segments */}
              <div className="absolute left-32 right-0 top-2">
                <AnimatePresence>
                  {track.segments.map(segment => renderSegment(track, segment))}
                </AnimatePresence>
              </div>
            </div>
          ))}
        </div>
        
        {/* Playhead */}
        <motion.div
          className="absolute top-0 bottom-0 w-0.5 bg-cyan-500 z-30 pointer-events-none"
          style={{ left: timeToPixel(playbackTime) }}
          animate={{ left: timeToPixel(playbackTime) }}
          transition={{ type: 'tween', duration: 0.1 }}
        >
          <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-cyan-500 rotate-45" />
        </motion.div>
      </div>
    </div>
  );
};

// Helper function to format time
function formatTime(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  
  return `${minutes}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export default SubtitleTimeline; 