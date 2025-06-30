import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Point {
  x: number;
  y: number;
}

interface PointSelectorProps {
  imageUrl: string;
  onMaskReady: (mask: ImageData) => void;
  onProcessing: (isProcessing: boolean) => void;
  samWorker: Worker | null;
}

const PointSelector: React.FC<PointSelectorProps> = ({ imageUrl, onMaskReady, onProcessing, samWorker }) => {
  const [points, setPoints] = useState<Point[]>([]);
  const [tempMask, setTempMask] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!samWorker) return;

    const handleWorkerMessage = (event: MessageEvent) => {
      const { status, maskImageData, error } = event.data;
      switch (status) {
        case 'processing':
          setIsProcessing(true);
          onProcessing(true);
          break;
        case 'complete':
          setIsProcessing(false);
          onProcessing(false);
          if (maskImageData) {
            // Convert mask to data URL for preview
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            canvas.width = maskImageData.width;
            canvas.height = maskImageData.height;
            ctx.putImageData(maskImageData, 0, 0);
            setTempMask(canvas.toDataURL());
            
            // Also pass the mask data back to parent
            onMaskReady(maskImageData);
          }
          break;
        case 'error':
          setIsProcessing(false);
          onProcessing(false);
          console.error('SAM Worker Error:', error);
          alert(`Segmentation failed: ${error}`);
          break;
      }
    };

    samWorker.addEventListener('message', handleWorkerMessage);
    return () => samWorker.removeEventListener('message', handleWorkerMessage);
  }, [samWorker, onMaskReady, onProcessing]);

  const handleImageClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!imageRef.current || isProcessing) return;

    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    const newPoint = { x, y };
    const newPoints = [...points, newPoint];
    setPoints(newPoints);

    // If we have points, trigger segmentation
    if (newPoints.length > 0) {
      triggerSegmentation(newPoints);
    }
  };

  const triggerSegmentation = async (inputPoints: Point[]) => {
    if (!samWorker || !imageRef.current) return;

    try {
      // Convert image to ImageData
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = imageRef.current.naturalWidth;
      canvas.height = imageRef.current.naturalHeight;
      ctx.drawImage(imageRef.current, 0, 0);
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

      // Send to worker with adjusted point coordinates
      const scaledPoints = inputPoints.map(point => ({
        x: (point.x / canvasRef.current!.width) * imageData.width,
        y: (point.y / canvasRef.current!.height) * imageData.height
      }));

      samWorker.postMessage({
        command: 'segment',
        imageData,
        inputPoints: scaledPoints
      });
    } catch (error) {
      console.error('Failed to trigger segmentation:', error);
    }
  };

  const clearPoints = () => {
    setPoints([]);
    setTempMask(null);
  };

  const redrawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Draw image
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    
    // Draw points
    points.forEach((point, index) => {
      ctx.fillStyle = 'red';
      ctx.beginPath();
      ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
      ctx.fill();
      
      // Point number
      ctx.fillStyle = 'white';
      ctx.font = '14px Arial';
      ctx.textAlign = 'center';
      ctx.fillText((index + 1).toString(), point.x, point.y + 4);
    });

    // Draw mask overlay if available
    if (tempMask && !isProcessing) {
      const maskImg = new Image();
      maskImg.onload = () => {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = 'blue';
        ctx.globalCompositeOperation = 'multiply';
        ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      };
      maskImg.src = tempMask;
    }
  };

  useEffect(() => {
    redrawCanvas();
  }, [points, tempMask]);

  const handleImageLoad = () => {
    const canvas = canvasRef.current;
    const img = imageRef.current;
    if (!canvas || !img) return;

    // Set canvas size to match image display size
    const containerWidth = canvas.parentElement?.clientWidth || 600;
    const aspectRatio = img.naturalHeight / img.naturalWidth;
    canvas.width = containerWidth;
    canvas.height = containerWidth * aspectRatio;
    
    redrawCanvas();
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <img
          ref={imageRef}
          src={imageUrl}
          alt="Image to segment"
          className="hidden"
          onLoad={handleImageLoad}
          crossOrigin="anonymous"
        />
        <canvas
          ref={canvasRef}
          onClick={handleImageClick}
          className="w-full border-2 border-gray-300 rounded-lg cursor-crosshair"
          style={{ maxWidth: '100%', height: 'auto' }}
        />
        
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 rounded-lg">
            <div className="text-white text-lg font-semibold">
              <div className="animate-spin w-8 h-8 border-4 border-white border-t-transparent rounded-full mx-auto mb-2"></div>
              Processing...
            </div>
          </div>
        )}
      </div>
      
      <div className="flex justify-between items-center">
        <div className="text-sm text-gray-600">
          Click on the object you want to segment. You have {points.length} point{points.length !== 1 ? 's' : ''}.
        </div>
        
        <div className="flex gap-2">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={clearPoints}
            disabled={points.length === 0 || isProcessing}
            className="px-4 py-2 bg-gray-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear Points
          </motion.button>
          
          {tempMask && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => points.length > 0 && triggerSegmentation(points)}
              disabled={isProcessing}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Refine Mask
            </motion.button>
          )}
        </div>
      </div>
      
      {tempMask && (
        <div className="text-center">
          <div className="text-sm text-green-600 font-medium">
            ✓ Segmentation complete! The mask is shown in blue overlay.
          </div>
        </div>
      )}
    </div>
  );
};

export default PointSelector; 