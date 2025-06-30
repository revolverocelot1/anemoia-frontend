import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';

interface BrushMaskingCanvasProps {
  imageUrl: string;
  onMaskReady: (mask: ImageData) => void;
}

interface Point {
  x: number;
  y: number;
}

interface BrushStroke {
  points: Point[];
  size: number;
  isEraser: boolean;
}

const BrushMaskingCanvas: React.FC<BrushMaskingCanvasProps> = ({ imageUrl, onMaskReady }) => {
  // Canvas and image refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  
  // Drawing state
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [brushSize, setBrushSize] = useState(20);
  const [isEraser, setIsEraser] = useState(false);
  const [opacity, setOpacity] = useState(0.7);
  
  // History for undo/redo
  const [strokes, setStrokes] = useState<BrushStroke[]>([]);
  const [undoHistory, setUndoHistory] = useState<BrushStroke[][]>([]);
  const [redoHistory, setRedoHistory] = useState<BrushStroke[][]>([]);
  
  // Smart features
  const [isSmartMode, setIsSmartMode] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  
  // Auto-save state
  const [lastSavedMask, setLastSavedMask] = useState<ImageData | null>(null);

  // Initialize canvas when image loads
  const handleImageLoad = useCallback(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !maskCanvas || !img) return;

    // Get container width and calculate responsive size
    const container = canvas.parentElement;
    const containerWidth = container?.clientWidth || 600;
    const maxWidth = Math.min(containerWidth - 32, 1000); // Subtract padding, max 1000px
    const aspectRatio = img.naturalHeight / img.naturalWidth;
    
    // Calculate display dimensions
    let displayWidth = maxWidth;
    let displayHeight = displayWidth * aspectRatio;
    
    // Ensure height doesn't exceed viewport
    const maxHeight = window.innerHeight * 0.6;
    if (displayHeight > maxHeight) {
      displayHeight = maxHeight;
      displayWidth = displayHeight / aspectRatio;
    }

    canvas.width = displayWidth;
    canvas.height = displayHeight;
    maskCanvas.width = displayWidth;
    maskCanvas.height = displayHeight;

    // Draw initial image
    const ctx = canvas.getContext('2d')!;
    ctx.drawImage(img, 0, 0, displayWidth, displayHeight);

    // Initialize mask canvas
    const maskCtx = maskCanvas.getContext('2d')!;
    maskCtx.fillStyle = 'rgba(0, 0, 0, 0)';
    maskCtx.fillRect(0, 0, displayWidth, displayHeight);
  }, []);

  // Redraw everything
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const img = imageRef.current;
    if (!canvas || !maskCanvas || !img) return;

    const ctx = canvas.getContext('2d')!;
    const maskCtx = maskCanvas.getContext('2d')!;

    // Clear canvases
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Draw base image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Draw all strokes on mask canvas
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';

    strokes.forEach(stroke => {
      if (stroke.points.length < 2) return;

      maskCtx.globalCompositeOperation = stroke.isEraser ? 'destination-out' : 'source-over';
      maskCtx.strokeStyle = stroke.isEraser ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)';
      maskCtx.lineWidth = stroke.size;

      maskCtx.beginPath();
      maskCtx.moveTo(stroke.points[0].x, stroke.points[0].y);
      
      for (let i = 1; i < stroke.points.length; i++) {
        maskCtx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }
      maskCtx.stroke();
    });

    // Draw current stroke if drawing
    if (isDrawing && currentStroke.length > 1) {
      maskCtx.globalCompositeOperation = isEraser ? 'destination-out' : 'source-over';
      maskCtx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : 'rgba(255,255,255,1)';
      maskCtx.lineWidth = brushSize;

      maskCtx.beginPath();
      maskCtx.moveTo(currentStroke[0].x, currentStroke[0].y);
      
      for (let i = 1; i < currentStroke.length; i++) {
        maskCtx.lineTo(currentStroke[i].x, currentStroke[i].y);
      }
      maskCtx.stroke();
    }

    // Draw mask overlay on main canvas if preview is enabled
    if (showPreview) {
      ctx.globalAlpha = opacity;
      ctx.fillStyle = '#3b82f6'; // Blue color for mask
      ctx.globalCompositeOperation = 'multiply';
      
      // Get mask image data and draw colored overlay
      const maskImageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = maskCanvas.width;
      tempCanvas.height = maskCanvas.height;
      const tempCtx = tempCanvas.getContext('2d')!;
      
      // Create colored mask
      for (let i = 0; i < maskImageData.data.length; i += 4) {
        const alpha = maskImageData.data[i + 3];
        if (alpha > 0) {
          tempCtx.fillStyle = `rgba(59, 130, 246, ${alpha / 255})`;
          const x = (i / 4) % maskCanvas.width;
          const y = Math.floor((i / 4) / maskCanvas.width);
          tempCtx.fillRect(x, y, 1, 1);
        }
      }
      
      ctx.drawImage(tempCanvas, 0, 0);
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';
    }

    // Generate and send mask data
    generateMaskData();
  }, [strokes, currentStroke, isDrawing, brushSize, isEraser, opacity, showPreview]);

  // Generate mask data for inpainting
  const generateMaskData = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const maskCtx = maskCanvas.getContext('2d')!;
    const imageData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    
    // Convert to binary mask (0 or 255)
    for (let i = 0; i < imageData.data.length; i += 4) {
      const alpha = imageData.data[i + 3];
      const value = alpha > 128 ? 255 : 0;
      imageData.data[i] = value;     // R
      imageData.data[i + 1] = value; // G
      imageData.data[i + 2] = value; // B
      imageData.data[i + 3] = 255;   // A
    }

    setLastSavedMask(imageData);
    onMaskReady(imageData);
  }, [onMaskReady]);

  // Mouse event handlers
  const getMousePos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getMousePos(e);
    setIsDrawing(true);
    setCurrentStroke([pos]);
    
    // Save state for undo
    setUndoHistory(prev => [...prev, [...strokes]]);
    setRedoHistory([]);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const pos = getMousePos(e);
    setCurrentStroke(prev => [...prev, pos]);
  };

  const handleMouseUp = () => {
    if (!isDrawing || currentStroke.length < 2) {
      setIsDrawing(false);
      setCurrentStroke([]);
      return;
    }

    // Add stroke to history
    const newStroke: BrushStroke = {
      points: [...currentStroke],
      size: brushSize,
      isEraser: isEraser
    };
    
    setStrokes(prev => [...prev, newStroke]);
    setIsDrawing(false);
    setCurrentStroke([]);
  };

  // Undo/Redo functions
  const handleUndo = () => {
    if (undoHistory.length === 0) return;
    
    const previousState = undoHistory[undoHistory.length - 1];
    setRedoHistory(prev => [...prev, [...strokes]]);
    setStrokes(previousState);
    setUndoHistory(prev => prev.slice(0, -1));
  };

  const handleRedo = () => {
    if (redoHistory.length === 0) return;
    
    const nextState = redoHistory[redoHistory.length - 1];
    setUndoHistory(prev => [...prev, [...strokes]]);
    setStrokes(nextState);
    setRedoHistory(prev => prev.slice(0, -1));
  };

  // Clear all strokes
  const handleClear = () => {
    setUndoHistory(prev => [...prev, [...strokes]]);
    setRedoHistory([]);
    setStrokes([]);
  };

  // Smart fill (flood fill for simple areas)
  const handleSmartFill = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isSmartMode) return;
    
    const pos = getMousePos(e);
    // TODO: Implement flood fill algorithm
    console.log('Smart fill at:', pos);
  };

  // Effects
  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              handleRedo();
            } else {
              handleUndo();
            }
            break;
          case 'y':
            e.preventDefault();
            handleRedo();
            break;
        }
      }
      
      switch (e.key) {
        case 'e':
        case 'E':
          setIsEraser(!isEraser);
          break;
        case 'b':
        case 'B':
          setIsEraser(false);
          break;
        case '[':
          setBrushSize(prev => Math.max(1, prev - 5));
          break;
        case ']':
          setBrushSize(prev => Math.min(100, prev + 5));
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isEraser, handleUndo, handleRedo]);

  return (
    <div className="space-y-4 w-full">
      {/* Canvas Container */}
      <div className="relative bg-gray-900 rounded-lg overflow-hidden w-full max-w-full">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Image to mask"
          className="hidden"
          onLoad={handleImageLoad}
          crossOrigin="anonymous"
        />
        
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onClick={isSmartMode ? handleSmartFill : undefined}
          className={`canvas-responsive border-2 border-gray-600 rounded-lg ${
            isEraser ? 'cursor-crosshair' : 'cursor-crosshair'
          } ${isSmartMode ? 'cursor-pointer' : ''}`}
          style={{ 
            cursor: isDrawing ? 'crosshair' : (isEraser ? 'crosshair' : 'crosshair'),
            touchAction: 'none' // Prevent scrolling on touch devices
          }}
        />
        
        {/* Hidden mask canvas */}
        <canvas ref={maskCanvasRef} className="hidden" />
        
        {/* Brush preview cursor */}
        {isDrawing && currentStroke.length > 0 && (
          <div
            className="absolute pointer-events-none rounded-full border-2 border-white opacity-50 z-10"
            style={{
              width: `${Math.max(8, Math.min(brushSize, 60))}px`,
              height: `${Math.max(8, Math.min(brushSize, 60))}px`,
              left: `${currentStroke[currentStroke.length - 1]?.x - brushSize / 2}px`,
              top: `${currentStroke[currentStroke.length - 1]?.y - brushSize / 2}px`,
            }}
          />
        )}
      </div>

      {/* Controls Panel */}
      <div className="bg-gray-800/50 p-3 sm:p-4 rounded-xl border border-gray-700 w-full">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
          {/* Brush Tool Selection */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">Tools</h4>
            <div className="flex gap-2">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsEraser(false)}
                className={`flex-1 py-2 px-3 text-sm rounded-lg transition-colors min-h-[44px] ${
                  !isEraser ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                🖌️ Brush
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsEraser(true)}
                className={`flex-1 py-2 px-3 text-sm rounded-lg transition-colors min-h-[44px] ${
                  isEraser ? 'bg-red-600 text-white' : 'bg-gray-700 text-gray-300'
                }`}
              >
                🧹 Eraser
              </motion.button>
            </div>
          </div>

          {/* Brush Size */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">
              Size: {brushSize}px
            </h4>
            <input
              type="range"
              min="1"
              max="100"
              value={brushSize}
              onChange={(e) => setBrushSize(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
            <div className="flex gap-1">
              {[5, 10, 20, 40].map(size => (
                <button
                  key={size}
                  onClick={() => setBrushSize(size)}
                  className="px-2 py-1 text-xs bg-gray-700 hover:bg-gray-600 rounded transition-colors"
                >
                  {size}
                </button>
              ))}
            </div>
          </div>

          {/* Opacity */}
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-gray-300">
              Preview Opacity: {Math.round(opacity * 100)}%
            </h4>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 mt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleUndo}
            disabled={undoHistory.length === 0}
            className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors min-h-[44px]"
          >
            ↶ Undo
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleRedo}
            disabled={redoHistory.length === 0}
            className="px-3 py-2 text-sm bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors min-h-[44px]"
          >
            ↷ Redo
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleClear}
            disabled={strokes.length === 0}
            className="px-3 py-2 text-sm bg-red-700 hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors min-h-[44px]"
          >
            🗑️ Clear
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setShowPreview(!showPreview)}
            className={`px-3 py-2 text-sm rounded-lg transition-colors min-h-[44px] ${
              showPreview ? 'bg-green-700 hover:bg-green-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
          >
            👁️ Preview
          </motion.button>
          
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => setIsSmartMode(!isSmartMode)}
            className={`px-3 py-2 text-sm rounded-lg transition-colors min-h-[44px] ${
              isSmartMode ? 'bg-purple-700 hover:bg-purple-600' : 'bg-gray-700 hover:bg-gray-600'
            }`}
            title="Smart fill mode - click to fill similar areas"
          >
            ✨ Smart
          </motion.button>
        </div>

        {/* Keyboard Shortcuts Help */}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="text-xs text-gray-400 space-y-1">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="font-semibold">Shortcuts:</span> Ctrl+Z (Undo), Ctrl+Y (Redo)
              </div>
              <div>
                B (Brush), E (Eraser), [ ] (Size)
              </div>
            </div>
          </div>
        </div>

        {/* Status */}
        {strokes.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-700">
            <div className="text-sm text-green-400">
              ✓ Mask ready with {strokes.length} stroke{strokes.length !== 1 ? 's' : ''} 
              {lastSavedMask && ` (${lastSavedMask.width}x${lastSavedMask.height})`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BrushMaskingCanvas;