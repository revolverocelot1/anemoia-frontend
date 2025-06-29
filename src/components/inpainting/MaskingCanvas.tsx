import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

interface MaskingCanvasProps {
  imageUrl: string;
  brushSize: number;
  onMaskChange: (maskData: ImageData) => void;
}

const MaskingCanvas = forwardRef((props: MaskingCanvasProps, ref) => {
  const { imageUrl, brushSize, onMaskChange } = props;
  const imageCanvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [imageLoaded, setImageLoaded] = useState(false);

  // Load image on both canvases
  useEffect(() => {
    const imageCanvas = imageCanvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!imageCanvas || !maskCanvas) return;

    const imageCtx = imageCanvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');
    if (!imageCtx || !maskCtx) return;

    const image = new Image();
    if (!imageUrl.startsWith('data:')) {
      image.crossOrigin = 'anonymous';
    }

    const handleLoaded = () => {
      // Set canvas dimensions
      imageCanvas.width = image.width;
      imageCanvas.height = image.height;
      maskCanvas.width = image.width;
      maskCanvas.height = image.height;

      // Draw image on image canvas
      imageCtx.drawImage(image, 0, 0);

      // Initialize mask canvas to black (no mask)
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

      // Save initial mask state
      const initialMask = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
      setHistory([initialMask]);
      setHistoryIndex(0);
      setImageLoaded(true);

      // Notify parent of initial (empty) mask
      onMaskChange(initialMask);
    };

    image.onerror = () => {
      console.error('Failed to load image for masking canvas');
      setImageLoaded(false);
    };

    // If the image was cached, onload may not fire. Handle that.
    if (image.complete && image.naturalWidth > 0) {
      handleLoaded();
    } else {
      image.onload = handleLoaded;
      image.src = imageUrl;
    }
  }, [imageUrl, onMaskChange]);

  const saveToHistory = () => {
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas?.getContext('2d');
    if (!maskCtx || !maskCanvas) return;

    const newHistory = history.slice(0, historyIndex + 1);
    const currentMask = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    setHistory([...newHistory, currentMask]);
    setHistoryIndex(newHistory.length);
    
    // Notify parent of mask change
    onMaskChange(currentMask);
  };

  useImperativeHandle(ref, () => ({
    undo: () => {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const maskCtx = maskCanvasRef.current?.getContext('2d');
        if (maskCtx) {
          maskCtx.putImageData(history[newIndex], 0, 0);
          onMaskChange(history[newIndex]);
        }
      }
    },
    redo: () => {
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        const maskCtx = maskCanvasRef.current?.getContext('2d');
        if (maskCtx) {
          maskCtx.putImageData(history[newIndex], 0, 0);
          onMaskChange(history[newIndex]);
        }
      }
    },
    reset: () => {
      if (history.length > 0) {
        setHistoryIndex(0);
        const maskCtx = maskCanvasRef.current?.getContext('2d');
        if (maskCtx) {
          maskCtx.putImageData(history[0], 0, 0);
          onMaskChange(history[0]);
        }
      }
    }
  }));

  const getCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    if ('touches' in event) {
      return {
        x: (event.touches[0].clientX - rect.left) * scaleX,
        y: (event.touches[0].clientY - rect.top) * scaleY
      };
    }
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!imageLoaded) return;
    event.preventDefault();
    
    const coords = getCoordinates(event);
    if (!coords) return;
    
    setIsDrawing(true);
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (!maskCtx) return;

    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.fillStyle = 'white';
    maskCtx.beginPath();
    maskCtx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fill();
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !imageLoaded) return;
    event.preventDefault();
    
    const coords = getCoordinates(event);
    if (!coords) return;
    
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (!maskCtx) return;

    maskCtx.globalCompositeOperation = 'source-over';
    maskCtx.fillStyle = 'white';
    maskCtx.beginPath();
    maskCtx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
    maskCtx.fill();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    saveToHistory();
  };

  if (!imageLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg">
        <div className="text-gray-400">Loading image...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg overflow-hidden relative">
      {/* Background image canvas */}
      <canvas
        ref={imageCanvasRef}
        className="absolute max-w-full max-h-full object-contain"
        style={{ opacity: 0.7 }}
      />
      
      {/* Mask overlay canvas */}
      <canvas
        ref={maskCanvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="absolute max-w-full max-h-full object-contain cursor-crosshair"
        style={{ 
          mixBlendMode: 'multiply',
          filter: 'invert(1)',
          opacity: 0.8
        }}
      />
      
      {/* Instruction overlay */}
      {historyIndex === 0 && (
        <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-2 rounded-lg text-sm pointer-events-none">
          Paint over objects to remove them
        </div>
      )}
    </div>
  );
});

MaskingCanvas.displayName = 'MaskingCanvas';

export default MaskingCanvas; 