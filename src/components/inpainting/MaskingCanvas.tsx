import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef } from 'react';

interface MaskingCanvasProps {
  imageUrl: string;
  brushSize: number;
  onMaskChange: (maskData: ImageData) => void;
}

const MaskingCanvas = forwardRef((props: MaskingCanvasProps, ref) => {
  const { imageUrl, brushSize, onMaskChange } = props;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    return canvas ? canvas.getContext('2d') : null;
  };
  
  // Initial image load
  useEffect(() => {
    const context = getCanvasContext();
    const canvas = canvasRef.current;
    if (!context || !canvas) return;

    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = imageUrl;
    image.onload = () => {
      canvas.width = image.width;
      canvas.height = image.height;
      context.drawImage(image, 0, 0, image.width, image.height);
      const initialData = context.getImageData(0, 0, canvas.width, canvas.height);
      setHistory([initialData]);
      setHistoryIndex(0);
    };
  }, [imageUrl]);

  const saveToHistory = () => {
    const context = getCanvasContext();
    const canvas = canvasRef.current;
    if (!context || !canvas) return;
    const newHistory = history.slice(0, historyIndex + 1);
    const currentData = context.getImageData(0, 0, canvas.width, canvas.height);
    setHistory([...newHistory, currentData]);
    setHistoryIndex(newHistory.length);
  };

  useImperativeHandle(ref, () => ({
    undo: () => {
      if (historyIndex > 0) {
        const newIndex = historyIndex - 1;
        setHistoryIndex(newIndex);
        const context = getCanvasContext();
        if (context) context.putImageData(history[newIndex], 0, 0);
      }
    },
    redo: () => {
      if (historyIndex < history.length - 1) {
        const newIndex = historyIndex + 1;
        setHistoryIndex(newIndex);
        const context = getCanvasContext();
        if (context) context.putImageData(history[newIndex], 0, 0);
      }
    },
    reset: () => {
        if (history.length > 0) {
            setHistoryIndex(0);
            const context = getCanvasContext();
            if (context) context.putImageData(history[0], 0, 0);
        }
    }
  }));

  const getCoordinates = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    const rect = canvas.getBoundingClientRect();
    if ('touches' in event) {
      return {
        x: event.touches[0].clientX - rect.left,
        y: event.touches[0].clientY - rect.top
      };
    }
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top
    };
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const coords = getCoordinates(event);
    if (!coords) return;
    setIsDrawing(true);
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    context.beginPath();
    context.moveTo(coords.x, coords.y);
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const coords = getCoordinates(event);
    if (!coords) return;
    const context = canvasRef.current?.getContext('2d');
    if (!context) return;
    
    context.globalCompositeOperation = 'destination-out';
    context.lineTo(coords.x, coords.y);
    context.lineWidth = brushSize;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.stroke();
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext('2d');
    if (!context || !canvas) return;

    context.closePath();
    setIsDrawing(false);
    
    // Create the mask data
    const originalImageData = context.getImageData(0, 0, canvas.width, canvas.height);
    const mask = new ImageData(canvas.width, canvas.height);
    for (let i = 0; i < originalImageData.data.length; i += 4) {
        // If alpha is 0, it's erased. Mark it white in the mask.
        if (originalImageData.data[i + 3] === 0) {
            mask.data[i] = 255;
            mask.data[i + 1] = 255;
            mask.data[i + 2] = 255;
            mask.data[i + 3] = 255;
        }
    }
    saveToHistory();
    onMaskChange(mask);
  };

  return (
    <div className="w-full h-full flex items-center justify-center bg-gray-900/50 rounded-lg overflow-hidden">
      <canvas
        ref={canvasRef}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
        className="max-w-full max-h-full object-contain cursor-crosshair"
      />
    </div>
  );
});

export default MaskingCanvas; 