import { useRef, useEffect, useState, useCallback } from 'react';

interface MaskingCanvasProps {
  image: string;
  onMaskUpdate: (maskData: ImageData) => void;
  settings: {
    quality: 'fast' | 'balanced' | 'high';
    maskDilation: number;
    autoMask: boolean;
  };
  disabled?: boolean;
}

interface Point {
  x: number;
  y: number;
}

const MaskingCanvas = ({ image, onMaskUpdate, settings, disabled = false }: MaskingCanvasProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState<'click' | 'brush' | 'eraser'>('click');
  const [brushSize, setBrushSize] = useState(20);
  const [maskVisible, setMaskVisible] = useState(true);
  const [clickPoints, setClickPoints] = useState<Point[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  // Initialize canvas when image changes
  useEffect(() => {
    if (!image) return;

    const img = new Image();
    img.onload = () => {
      if (canvasRef.current && maskCanvasRef.current) {
        
        // Calculate canvas size maintaining aspect ratio
        const maxWidth = 800;
        const maxHeight = 600;
        const aspectRatio = img.width / img.height;
        
        let width, height;
        if (aspectRatio > maxWidth / maxHeight) {
          width = Math.min(maxWidth, img.width);
          height = width / aspectRatio;
        } else {
          height = Math.min(maxHeight, img.height);
          width = height * aspectRatio;
        }

        setCanvasSize({ width, height });
        
        // Set canvas dimensions
        [canvasRef.current, maskCanvasRef.current].forEach(canvas => {
          canvas.width = width;
          canvas.height = height;
          canvas.style.width = `${width}px`;
          canvas.style.height = `${height}px`;
        });

        // Draw image
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);
        }

        // Clear mask
        const maskCtx = maskCanvasRef.current.getContext('2d');
        if (maskCtx) {
          maskCtx.clearRect(0, 0, width, height);
        }

        setImageLoaded(true);
        setClickPoints([]);
      }
    };
    img.src = image;
  }, [image]);

  // Handle click-to-segment
  const handleCanvasClick = useCallback(async (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || tool !== 'click' || !imageLoaded) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    const newPoint = { x, y };
    setClickPoints(prev => [...prev, newPoint]);

    // Simulate SAM segmentation (in real implementation, this would call the SAM model)
    await simulateSegmentation(newPoint);
  }, [disabled, tool, imageLoaded]);

  // Simulate segmentation for demonstration
  const simulateSegmentation = useCallback(async (point: Point) => {
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;

    const ctx = maskCanvas.getContext('2d');
    if (!ctx) return;

    // Simulate processing delay
    await new Promise(resolve => setTimeout(resolve, 100));

    // Create a simple circular mask for demonstration
    // In real implementation, this would be replaced with actual SAM segmentation
    ctx.fillStyle = 'rgba(255, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 50 + Math.random() * 50, 0, 2 * Math.PI);
    ctx.fill();

    // Apply mask dilation
    if (settings.maskDilation > 0) {
      dilateMask(ctx, settings.maskDilation);
    }

    // Get mask data and notify parent
    const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    onMaskUpdate(imageData);
  }, [settings.maskDilation, onMaskUpdate]);

  // Handle brush drawing
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (disabled || tool === 'click') return;
    setIsDrawing(true);
    handleBrushDraw(e);
  }, [disabled, tool]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || disabled || tool === 'click') return;
    handleBrushDraw(e);
  }, [isDrawing, disabled, tool]);

  const handleMouseUp = useCallback(() => {
    if (isDrawing) {
      setIsDrawing(false);
      // Update mask after drawing
      const maskCanvas = maskCanvasRef.current;
      if (maskCanvas) {
        const ctx = maskCanvas.getContext('2d');
        if (ctx) {
          const imageData = ctx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
          onMaskUpdate(imageData);
        }
      }
    }
  }, [isDrawing, onMaskUpdate]);

  const handleBrushDraw = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = maskCanvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((e.clientY - rect.top) / rect.height) * canvas.height;

    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.fillStyle = tool === 'eraser' ? 'rgba(0,0,0,1)' : 'rgba(255, 0, 0, 0.6)';
    ctx.beginPath();
    ctx.arc(x, y, brushSize / 2, 0, 2 * Math.PI);
    ctx.fill();
  }, [tool, brushSize]);

  // Dilate mask utility function
  const dilateMask = useCallback((ctx: CanvasRenderingContext2D, kernelSize: number) => {
    if (kernelSize <= 0) return;

    const canvas = ctx.canvas;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    const width = canvas.width;
    const height = canvas.height;
    
    // Simple dilation algorithm
    const dilated = new Uint8ClampedArray(data);
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        if (data[idx + 3] > 0) { // If pixel has alpha
          // Dilate around this pixel
          for (let dy = -kernelSize; dy <= kernelSize; dy++) {
            for (let dx = -kernelSize; dx <= kernelSize; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              
              if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
                const nidx = (ny * width + nx) * 4;
                if (Math.sqrt(dx * dx + dy * dy) <= kernelSize) {
                  dilated[nidx] = data[idx];     // R
                  dilated[nidx + 1] = data[idx + 1]; // G
                  dilated[nidx + 2] = data[idx + 2]; // B
                  dilated[nidx + 3] = data[idx + 3]; // A
                }
              }
            }
          }
        }
      }
    }
    
    const newImageData = new ImageData(dilated, width, height);
    ctx.putImageData(newImageData, 0, 0);
  }, []);

  const clearMask = useCallback(() => {
    const maskCanvas = maskCanvasRef.current;
    if (maskCanvas) {
      const ctx = maskCanvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
        onMaskUpdate(new ImageData(maskCanvas.width, maskCanvas.height));
      }
    }
    setClickPoints([]);
  }, [onMaskUpdate]);

  const toggleMaskVisibility = useCallback(() => {
    setMaskVisible(prev => !prev);
  }, []);

  return (
    <div className="w-full h-full flex flex-col gap-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between p-4 bg-[var(--surface)] border border-[var(--border)] rounded-lg">
        <div className="flex items-center gap-4">
          {/* Tool Selection */}
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--text)]">Tool:</span>
            <div className="flex border border-[var(--border)] rounded-lg overflow-hidden">
              {[
                { id: 'click', icon: 'touch_app', label: 'Click' },
                { id: 'brush', icon: 'brush', label: 'Brush' },
                { id: 'eraser', icon: 'auto_fix_off', label: 'Eraser' }
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTool(t.id as any)}
                  disabled={disabled}
                  className={`
                    px-3 py-2 text-sm flex items-center gap-1 transition-colors
                    ${tool === t.id 
                      ? 'bg-[var(--primary)] text-white' 
                      : 'bg-[var(--background)] text-[var(--text)] hover:bg-[var(--surface)]'
                    }
                    disabled:opacity-50 disabled:cursor-not-allowed
                  `}
                >
                  <span className="material-symbols-outlined text-sm">{t.icon}</span>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Brush Size */}
          {(tool === 'brush' || tool === 'eraser') && (
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-[var(--text)]">Size:</span>
              <input
                type="range"
                min="5"
                max="100"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                disabled={disabled}
                className="w-20"
              />
              <span className="text-sm text-[var(--text-secondary)] w-8">{brushSize}</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Mask Visibility Toggle */}
          <button
            onClick={toggleMaskVisibility}
            disabled={disabled}
            className="px-3 py-2 text-sm bg-[var(--background)] border border-[var(--border)] rounded-lg
                     hover:bg-[var(--surface)] disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">
              {maskVisible ? 'visibility' : 'visibility_off'}
            </span>
            Mask
          </button>

          {/* Clear Mask */}
          <button
            onClick={clearMask}
            disabled={disabled}
            className="px-3 py-2 text-sm bg-red-600 text-white rounded-lg
                     hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed
                     transition-colors flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-sm">clear</span>
            Clear
          </button>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 relative bg-[var(--surface)] border border-[var(--border)] rounded-lg overflow-hidden">
        <div className="w-full h-full flex items-center justify-center p-4">
          {imageLoaded ? (
            <div className="relative" style={{ width: canvasSize.width, height: canvasSize.height }}>
              {/* Main Image Canvas */}
              <canvas
                ref={canvasRef}
                className="absolute inset-0 cursor-crosshair"
                onClick={handleCanvasClick}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ pointerEvents: disabled ? 'none' : 'auto' }}
              />
              
              {/* Mask Overlay Canvas */}
              <canvas
                ref={maskCanvasRef}
                className={`absolute inset-0 pointer-events-none transition-opacity duration-200 ${
                  maskVisible ? 'opacity-100' : 'opacity-0'
                }`}
              />

              {/* Click Points Indicators */}
              {clickPoints.map((point, index) => (
                <div
                  key={index}
                  className="absolute w-3 h-3 border-2 border-white bg-blue-500 rounded-full transform -translate-x-1/2 -translate-y-1/2 pointer-events-none"
                  style={{
                    left: `${(point.x / canvasSize.width) * 100}%`,
                    top: `${(point.y / canvasSize.height) * 100}%`
                  }}
                />
              ))}

              {/* Disabled Overlay */}
              {disabled && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                  <div className="bg-white/90 px-4 py-2 rounded-lg text-sm font-medium">
                    Processing...
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-[var(--text-secondary)]">Loading image...</div>
            </div>
          )}
        </div>
      </div>

      {/* Instructions */}
      <div className="text-sm text-[var(--text-secondary)] bg-[var(--surface)] border border-[var(--border)] rounded-lg p-3">
        {tool === 'click' && "Click on objects to automatically segment them with AI"}
        {tool === 'brush' && "Click and drag to manually paint mask areas"}
        {tool === 'eraser' && "Click and drag to erase mask areas"}
      </div>
    </div>
  );
};

export default MaskingCanvas;