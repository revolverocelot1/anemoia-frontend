import React, { useState, useRef, useCallback } from 'react';
import { motion, useDragControls } from 'framer-motion';

interface ResizableVideoContainerProps {
  children: React.ReactNode;
  minWidth?: number;
  minHeight?: number;
  defaultWidth?: number;
  defaultHeight?: number;
}

export const ResizableVideoContainer: React.FC<ResizableVideoContainerProps> = ({
  children,
  minWidth = 400,
  minHeight = 300,
  defaultWidth = 800,
  defaultHeight = 450
}) => {
  const [size, setSize] = useState({ width: defaultWidth, height: defaultHeight });
  const [isResizing, setIsResizing] = useState(false);
  const [resizeHandle, setResizeHandle] = useState<string>('');
  const containerRef = useRef<HTMLDivElement>(null);
  const dragControls = useDragControls();

  const handleResize = useCallback((e: MouseEvent) => {
    if (!isResizing || !containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    let newWidth = size.width;
    let newHeight = size.height;

    if (resizeHandle.includes('right')) {
      newWidth = Math.max(minWidth, e.clientX - rect.left);
    }
    if (resizeHandle.includes('left')) {
      const delta = rect.left - e.clientX;
      newWidth = Math.max(minWidth, size.width + delta);
    }
    if (resizeHandle.includes('bottom')) {
      newHeight = Math.max(minHeight, e.clientY - rect.top);
    }
    if (resizeHandle.includes('top')) {
      const delta = rect.top - e.clientY;
      newHeight = Math.max(minHeight, size.height + delta);
    }

    // Maintain aspect ratio for corner handles
    if (resizeHandle.includes('corner')) {
      const aspectRatio = defaultWidth / defaultHeight;
      if (resizeHandle.includes('right')) {
        newHeight = newWidth / aspectRatio;
      } else {
        newWidth = newHeight * aspectRatio;
      }
    }

    setSize({ width: newWidth, height: newHeight });
  }, [isResizing, resizeHandle, size, minWidth, minHeight, defaultWidth, defaultHeight]);

  const handleResizeEnd = useCallback(() => {
    setIsResizing(false);
    setResizeHandle('');
    document.body.style.cursor = 'default';
  }, []);

  const handleResizeStart = (handle: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsResizing(true);
    setResizeHandle(handle);
    document.body.style.cursor = handle.includes('corner') ? 'nwse-resize' : 
                                handle.includes('horizontal') ? 'ew-resize' : 'ns-resize';
  };

  React.useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', handleResizeEnd);
      return () => {
        document.removeEventListener('mousemove', handleResize);
        document.removeEventListener('mouseup', handleResizeEnd);
      };
    }
  }, [isResizing, handleResize, handleResizeEnd]);

  return (
    <motion.div
      ref={containerRef}
      className="relative bg-gray-950 rounded-xl shadow-2xl overflow-hidden"
      style={{ width: size.width, height: size.height }}
      drag={!isResizing}
      dragControls={dragControls}
      dragMomentum={false}
      dragElastic={0}
      whileHover={{ boxShadow: '0 0 40px rgba(6, 182, 212, 0.3)' }}
      transition={{ boxShadow: { duration: 0.3 } }}
    >
      {/* Video Content */}
      <div className="relative w-full h-full">
        {children}
      </div>

      {/* Resize Handles */}
      {/* Corners */}
      <div
        className="absolute top-0 left-0 w-4 h-4 cursor-nwse-resize group"
        onMouseDown={handleResizeStart('top-left-corner')}
      >
        <div className="absolute inset-0 bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-br-lg" />
      </div>
      <div
        className="absolute top-0 right-0 w-4 h-4 cursor-nesw-resize group"
        onMouseDown={handleResizeStart('top-right-corner')}
      >
        <div className="absolute inset-0 bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-bl-lg" />
      </div>
      <div
        className="absolute bottom-0 left-0 w-4 h-4 cursor-nesw-resize group"
        onMouseDown={handleResizeStart('bottom-left-corner')}
      >
        <div className="absolute inset-0 bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-tr-lg" />
      </div>
      <div
        className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize group"
        onMouseDown={handleResizeStart('bottom-right-corner')}
      >
        <div className="absolute inset-0 bg-cyan-500 opacity-0 group-hover:opacity-100 transition-opacity rounded-tl-lg" />
      </div>

      {/* Edges */}
      <div
        className="absolute top-0 left-4 right-4 h-2 cursor-ns-resize group"
        onMouseDown={handleResizeStart('top')}
      >
        <div className="absolute inset-0 bg-cyan-500 opacity-0 group-hover:opacity-30 transition-opacity" />
      </div>
      <div
        className="absolute bottom-0 left-4 right-4 h-2 cursor-ns-resize group"
        onMouseDown={handleResizeStart('bottom')}
      >
        <div className="absolute inset-0 bg-cyan-500 opacity-0 group-hover:opacity-30 transition-opacity" />
      </div>
      <div
        className="absolute left-0 top-4 bottom-4 w-2 cursor-ew-resize group"
        onMouseDown={handleResizeStart('left')}
      >
        <div className="absolute inset-0 bg-cyan-500 opacity-0 group-hover:opacity-30 transition-opacity" />
      </div>
      <div
        className="absolute right-0 top-4 bottom-4 w-2 cursor-ew-resize group"
        onMouseDown={handleResizeStart('right')}
      >
        <div className="absolute inset-0 bg-cyan-500 opacity-0 group-hover:opacity-30 transition-opacity" />
      </div>

      {/* Drag Handle */}
      <div 
        className="absolute top-2 left-1/2 transform -translate-x-1/2 cursor-move"
        onMouseDown={(e) => dragControls.start(e as unknown as PointerEvent)}
      >
        <div className="flex space-x-1 px-3 py-1 bg-gray-800/80 rounded-full backdrop-blur-sm">
          <div className="w-1 h-1 bg-gray-500 rounded-full" />
          <div className="w-1 h-1 bg-gray-500 rounded-full" />
          <div className="w-1 h-1 bg-gray-500 rounded-full" />
        </div>
      </div>

      {/* Size indicator */}
      {isResizing && (
        <div className="absolute top-4 right-4 bg-gray-900/90 backdrop-blur-sm px-3 py-1 rounded-lg text-xs text-cyan-400 font-mono">
          {Math.round(size.width)} × {Math.round(size.height)}
        </div>
      )}
    </motion.div>
  );
};

export default ResizableVideoContainer; 