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
          const canvas = document.createElement('canvas');
          canvas.width = maskImageData.width;
          canvas.height = maskImageData.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.putImageData(maskImageData, 0, 0);
            setTempMask(canvas.toDataURL());
            onMaskReady(maskImageData); // Pass the raw mask data up
          }
          setIsProcessing(false);
          onProcessing(false);
          break;
        case 'error':
          console.error('SAM Worker Error:', error);
          setIsProcessing(false);
          onProcessing(false);
          break;
      }
    };

    samWorker.addEventListener('message', handleWorkerMessage);
    return () => samWorker.removeEventListener('message', handleWorkerMessage);
  }, [samWorker, onMaskReady, onProcessing]);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isProcessing || !imageRef.current) return;

    const imageRect = imageRef.current.getBoundingClientRect();
    const x = e.clientX - imageRect.left;
    const y = e.clientY - imageRect.top;
    
    // Normalize coordinates to image's original dimensions
    const scaleX = imageRef.current.naturalWidth / imageRect.width;
    const scaleY = imageRef.current.naturalHeight / imageRect.height;
    
    const imagePoint = { x: Math.round(x * scaleX), y: Math.round(y * scaleY) };
    const newPoints = [...points, imagePoint];
    setPoints(newPoints);

    // Trigger SAM worker
    if (samWorker) {
      samWorker.postMessage({
        command: 'segment',
        imageUrl,
        inputPoints: [[newPoints.map(p => ({ x: p.x, y: p.y }))]],
      });
    }
  };

  const handleResetPoints = () => {
    setPoints([]);
    setTempMask(null);
  }

  return (
    <div className="relative w-full h-full" onClick={handleImageClick}>
      <img
        ref={imageRef}
        src={imageUrl}
        alt="Click to select object"
        className="w-full h-full object-contain cursor-crosshair"
      />

      {tempMask && (
        <motion.img
          src={tempMask}
          alt="Generated mask"
          className="absolute top-0 left-0 w-full h-full object-contain pointer-events-none opacity-50"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.5 }}
          transition={{ duration: 0.2 }}
        />
      )}

      {points.map((p, i) => {
        if (!imageRef.current) return null;
        const imageRect = imageRef.current.getBoundingClientRect();
        const scaleX = imageRect.width / imageRef.current.naturalWidth;
        const scaleY = imageRect.height / imageRef.current.naturalHeight;
        
        return (
            <motion.div
                key={i}
                className="absolute w-3 h-3 bg-green-400 rounded-full border-2 border-white shadow-lg"
                style={{
                    left: p.x * scaleX - 6,
                    top: p.y * scaleY - 6,
                }}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
            />
        );
      })}

      {isProcessing && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-white">Processing...</div>
          </div>
      )}

      <div className="absolute top-2 right-2">
        <button onClick={handleResetPoints} className="px-4 py-2 bg-red-600 text-white rounded-lg">Reset Points</button>
      </div>
    </div>
  );
};

export default PointSelector; 