import React, { useRef, useState, useEffect, useCallback } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { useSubtitleStore } from '../../stores/subtitle-store';
import type { SubtitleSegment, SubtitleTrack, SubtitlePosition } from '../../types/subtitle';

interface SubtitleOverlayProps {
  containerRef: React.RefObject<HTMLDivElement>;
  currentTime: number;
}

export const SubtitleOverlay: React.FC<SubtitleOverlayProps> = ({
  containerRef,
  currentTime
}) => {
  const dragControls = useDragControls();
  const [isEditing, setIsEditing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);
  const [containerBounds, setContainerBounds] = useState({ width: 0, height: 0 });
  
  const { currentProject, updateTrackPosition } = useSubtitleStore();
  
  // Get active track
  const activeTrack = currentProject?.tracks.find(
    t => t.id === currentProject.activeTrackId
  );
  
  // Get current subtitle segment
  const currentSegment = activeTrack?.segments.find(
    segment => currentTime >= segment.startTime && currentTime <= segment.endTime
  );
  
  // Update container bounds
  useEffect(() => {
    const updateBounds = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setContainerBounds({ width: rect.width, height: rect.height });
      }
    };
    
    updateBounds();
    window.addEventListener('resize', updateBounds);
    return () => window.removeEventListener('resize', updateBounds);
  }, [containerRef]);
  
  // Calculate position in pixels
  const getPositionInPixels = (position: SubtitlePosition) => {
    if (position.unit === 'pixels') {
      return {
        x: position.x,
        y: position.y,
        width: position.width,
        height: position.height
      };
    }
    
    // Convert percentages to pixels
    return {
      x: (position.x / 100) * containerBounds.width,
      y: (position.y / 100) * containerBounds.height,
      width: (position.width / 100) * containerBounds.width,
      height: (position.height / 100) * containerBounds.height
    };
  };
  
  // Convert pixels to percentages for storage
  const convertToPercentages = (x: number, y: number, width: number, height: number) => {
    return {
      x: (x / containerBounds.width) * 100,
      y: (y / containerBounds.height) * 100,
      width: (width / containerBounds.width) * 100,
      height: (height / containerBounds.height) * 100,
      unit: 'percent' as const
    };
  };
  
  // Handle drag end
  const handleDragEnd = (event: any, info: any) => {
    if (!activeTrack || !containerBounds.width || !containerBounds.height) return;
    
    const currentPos = getPositionInPixels(activeTrack.position);
    const newX = currentPos.x + info.offset.x;
    const newY = currentPos.y + info.offset.y;
    
    // Constrain within bounds
    const constrainedX = Math.max(0, Math.min(newX, containerBounds.width - currentPos.width));
    const constrainedY = Math.max(0, Math.min(newY, containerBounds.height - currentPos.height));
    
    // Update position
    const newPosition = convertToPercentages(
      constrainedX,
      constrainedY,
      currentPos.width,
      currentPos.height
    );
    
    updateTrackPosition(activeTrack.id, newPosition);
    setIsDragging(false);
  };
  
  // Handle resize
  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing || !resizeHandle || !activeTrack) return;
    
    const currentPos = getPositionInPixels(activeTrack.position);
    const containerRect = containerRef.current?.getBoundingClientRect();
    if (!containerRect) return;
    
    const mouseX = e.clientX - containerRect.left;
    const mouseY = e.clientY - containerRect.top;
    
    let newX = currentPos.x;
    let newY = currentPos.y;
    let newWidth = currentPos.width;
    let newHeight = currentPos.height;
    
    // Handle different resize handles
    if (resizeHandle.includes('right')) {
      newWidth = Math.max(100, mouseX - currentPos.x);
    }
    if (resizeHandle.includes('left')) {
      const delta = mouseX - currentPos.x;
      newX = mouseX;
      newWidth = Math.max(100, currentPos.width - delta);
    }
    if (resizeHandle.includes('bottom')) {
      newHeight = Math.max(50, mouseY - currentPos.y);
    }
    if (resizeHandle.includes('top')) {
      const delta = mouseY - currentPos.y;
      newY = mouseY;
      newHeight = Math.max(50, currentPos.height - delta);
    }
    
    // Constrain within bounds
    newX = Math.max(0, Math.min(newX, containerBounds.width - newWidth));
    newY = Math.max(0, Math.min(newY, containerBounds.height - newHeight));
    newWidth = Math.min(newWidth, containerBounds.width - newX);
    newHeight = Math.min(newHeight, containerBounds.height - newY);
    
    // Update position
    const newPosition = convertToPercentages(newX, newY, newWidth, newHeight);
    updateTrackPosition(activeTrack.id, newPosition);
  }, [isResizing, resizeHandle, activeTrack, containerRef, containerBounds, updateTrackPosition]);
  
  // Handle resize end
  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeHandle(null);
  }, []);
  
  // Add resize event listeners
  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', handleResize);
      window.addEventListener('mouseup', handleResizeEnd);
      return () => {
        window.removeEventListener('mousemove', handleResize);
        window.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResize, handleResizeEnd]);
  
  if (!activeTrack || !currentSegment || !containerBounds.width) {
    return null;
  }
  
  const position = getPositionInPixels(activeTrack.position);
  const style = activeTrack.style;
  
  return (
    <motion.div
      className={`absolute flex items-center justify-center select-none ${
        isEditing ? 'cursor-text' : 'cursor-move'
      }`}
      style={{
        left: 0,
        top: 0,
        width: position.width,
        height: position.height,
        x: position.x,
        y: position.y,
      }}
      drag={!isEditing && !isResizing}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={handleDragEnd}
      whileHover={{ scale: isEditing || isDragging || isResizing ? 1 : 1.02 }}
    >
      {/* Subtitle Text */}
      <div
        className="relative w-full h-full flex items-center justify-center"
        style={{
          padding: `${style.padding}px`,
        }}
      >
        <div
          className="subtitle-text"
          style={{
            fontFamily: style.fontFamily,
            fontSize: `${style.fontSize}px`,
            fontWeight: style.fontWeight,
            fontStyle: style.fontStyle,
            color: style.color,
            backgroundColor: style.backgroundColor 
              ? `${style.backgroundColor}${Math.round((style.backgroundOpacity || 1) * 255).toString(16).padStart(2, '0')}`
              : 'transparent',
            textShadow: style.shadowColor
              ? `${style.shadowOffsetX}px ${style.shadowOffsetY}px ${style.shadowBlur}px ${style.shadowColor}`
              : 'none',
            WebkitTextStroke: style.strokeWidth 
              ? `${style.strokeWidth}px ${style.strokeColor}`
              : 'none',
            borderRadius: `${style.borderRadius}px`,
            textAlign: style.textAlign,
            lineHeight: style.lineHeight,
            letterSpacing: `${style.letterSpacing}px`,
            padding: `${style.padding}px`,
            wordWrap: 'break-word',
            maxWidth: '100%',
            maxHeight: '100%',
            overflow: 'hidden',
          }}
          onDoubleClick={() => setIsEditing(true)}
        >
          {currentSegment.text}
        </div>
      </div>
      
      {/* Resize Handles */}
      {!isEditing && !isDragging && (
        <>
          {/* Corner handles */}
          {['top-left', 'top-right', 'bottom-left', 'bottom-right'].map(handle => (
            <div
              key={handle}
              className={`absolute w-3 h-3 bg-cyan-500 rounded-full cursor-${handle.replace('-', '-resize-')}`}
              style={{
                top: handle.includes('top') ? -6 : 'auto',
                bottom: handle.includes('bottom') ? -6 : 'auto',
                left: handle.includes('left') ? -6 : 'auto',
                right: handle.includes('right') ? -6 : 'auto',
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsResizing(true);
                setResizeHandle(handle);
              }}
            />
          ))}
          
          {/* Edge handles */}
          {['top', 'right', 'bottom', 'left'].map(handle => (
            <div
              key={handle}
              className={`absolute bg-cyan-500/50 hover:bg-cyan-500 transition-colors cursor-${handle}-resize`}
              style={{
                ...(handle === 'top' && { top: -4, left: 20, right: 20, height: 8 }),
                ...(handle === 'bottom' && { bottom: -4, left: 20, right: 20, height: 8 }),
                ...(handle === 'left' && { left: -4, top: 20, bottom: 20, width: 8 }),
                ...(handle === 'right' && { right: -4, top: 20, bottom: 20, width: 8 }),
              }}
              onMouseDown={(e) => {
                e.stopPropagation();
                setIsResizing(true);
                setResizeHandle(handle);
              }}
            />
          ))}
        </>
      )}
      
      {/* Edit Mode Border */}
      {(isEditing || !isDragging) && (
        <div className="absolute inset-0 border-2 border-cyan-500 rounded pointer-events-none" />
      )}
    </motion.div>
  );
};

export default SubtitleOverlay; 