import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import LoadingOverlay from '../components/LoadingOverlay';

interface Point {
  x: number;
  y: number;
}

interface StrokePoint extends Point {
  pressure?: number;
}

interface HistoryState {
  imageData: ImageData;
  maskData: ImageData;
}

const InpaintingPage = () => {
  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // State management
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImage, setProcessedImage] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [brushSize, setBrushSize] = useState(20);
  const [showComparison, setShowComparison] = useState(0); // 0 = original, 100 = processed
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging] = useState(false);

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[]>([]);
  const [modelLoaded, setModelLoaded] = useState(false);

  // Worker ref
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/inpainting.worker.ts', import.meta.url), {
      type: 'module'
    });

    workerRef.current.onmessage = (event) => {
      const { type, data, error } = event.data;
      
      switch (type) {
        case 'MODEL_LOADED':
          setModelLoaded(true);
          console.log('AOT-GAN model loaded successfully');
          break;
        case 'MODEL_ERROR':
          console.error('Failed to load AOT-GAN model:', error);
          alert('Failed to load inpainting model. Please refresh the page.');
          break;
        case 'INPAINTING_COMPLETE':
          handleInpaintingComplete(data);
          break;
        case 'INPAINTING_ERROR':
          setIsProcessing(false);
          console.error('Inpainting error:', error);
          alert('Inpainting failed. Please try again.');
          break;
      }
    };

    // Load the model
    workerRef.current.postMessage({ type: 'LOAD_MODEL' });

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Canvas setup
  useEffect(() => {
    if (originalImage && canvasRef.current && maskCanvasRef.current) {
      setupCanvases();
    }
  }, [originalImage]);

  const setupCanvases = () => {
    if (!originalImage || !canvasRef.current || !maskCanvasRef.current) return;

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    if (!ctx || !maskCtx) return;

    // Set canvas size
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    maskCanvas.width = originalImage.width;
    maskCanvas.height = originalImage.height;

    // Draw original image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0);

    // Clear mask
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Save initial state
    saveHistoryState();
  };

  const saveHistoryState = () => {
    if (!canvasRef.current || !maskCanvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    const maskCtx = maskCanvasRef.current.getContext('2d');
    if (!ctx || !maskCtx) return;

    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    const maskData = maskCtx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ imageData, maskData });
    
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const state = history[newIndex];
      
      if (canvasRef.current && maskCanvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        const maskCtx = maskCanvasRef.current.getContext('2d');
        
        if (ctx && maskCtx) {
          ctx.putImageData(state.imageData, 0, 0);
          maskCtx.putImageData(state.maskData, 0, 0);
          setHistoryIndex(newIndex);
        }
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const state = history[newIndex];
      
      if (canvasRef.current && maskCanvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        const maskCtx = maskCanvasRef.current.getContext('2d');
        
        if (ctx && maskCtx) {
          ctx.putImageData(state.imageData, 0, 0);
          maskCtx.putImageData(state.maskData, 0, 0);
          setHistoryIndex(newIndex);
        }
      }
    }
  };

  const getCanvasPoint = (event: React.MouseEvent): Point => {
    if (!canvasRef.current || !containerRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();

    
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  const startPainting = (event: React.MouseEvent) => {
    const point = getCanvasPoint(event);
    setIsPainting(true);
    setCurrentStroke([point]);
    drawBrushStroke(point, point);
  };

  const paint = (event: React.MouseEvent) => {
    if (!isPainting) return;

    const point = getCanvasPoint(event);
    const lastPoint = currentStroke[currentStroke.length - 1];
    
    if (lastPoint) {
      drawBrushStroke(lastPoint, point);
      setCurrentStroke(prev => [...prev, point]);
    }
  };

  const stopPainting = () => {
    if (isPainting) {
      setIsPainting(false);
      setCurrentStroke([]);
      saveHistoryState();
    }
  };

  const drawBrushStroke = (from: Point, to: Point) => {
    if (!maskCanvasRef.current) return;

    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = 'white';
    
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const clearMask = () => {
    if (!maskCanvasRef.current) return;

    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    
    saveHistoryState();
  };

  const resetPosition = () => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setProcessedImage(null);
        setShowComparison(0);
        setHistory([]);
        setHistoryIndex(-1);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const startInpainting = async () => {
    if (!originalImage || !canvasRef.current || !maskCanvasRef.current || !workerRef.current) return;

    setIsProcessing(true);

    // Get image and mask data
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    
    const imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);
    const maskData = maskCanvas.getContext('2d')?.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    if (!imageData || !maskData) {
      setIsProcessing(false);
      return;
    }

    // Send to worker
    workerRef.current.postMessage({
      type: 'INPAINT',
      data: {
        imageData: imageData,
        maskData: maskData,
        width: canvas.width,
        height: canvas.height
      }
    });
  };

  const handleInpaintingComplete = (resultImageData: ImageData) => {
    if (!previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = resultImageData.width;
    canvas.height = resultImageData.height;
    ctx.putImageData(resultImageData, 0, 0);

    // Create processed image
    const img = new Image();
    img.onload = () => {
      setProcessedImage(img);
      setIsProcessing(false);
      setShowComparison(100);
    };
    img.src = canvas.toDataURL();
  };

  const downloadResult = () => {
    if (!processedImage) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = processedImage.width;
    canvas.height = processedImage.height;
    ctx.drawImage(processedImage, 0, 0);

    const link = document.createElement('a');
    link.download = 'inpainted-image.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [history, historyIndex]);

  const canvasStyle = useMemo(() => ({
    transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
    transformOrigin: 'center center',
    cursor: isPainting ? 'crosshair' : isDragging ? 'grabbing' : 'grab'
  }), [zoom, panOffset, isPainting, isDragging]);

  const comparisonStyle = useMemo(() => {
    if (!processedImage) return {};
    
    return {
      background: `linear-gradient(to right, 
        transparent 0%, 
        transparent ${showComparison}%, 
        rgba(0,0,0,0.1) ${showComparison}%, 
        rgba(0,0,0,0.1) 100%)`
    };
  }, [showComparison, processedImage]);

  return (
    <div className="relative flex size-full min-h-screen flex-col dark group/design-root overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8"
            >
              <h1 className="text-3xl sm:text-4xl font-bold mb-4">
                AI Image Inpainting
              </h1>
              <p className="text-lg text-[var(--text-secondary)] max-w-2xl mx-auto">
                Remove unwanted objects or fill missing areas using AOT-GAN powered by WebGPU
              </p>
            </motion.div>

            {/* Upload Section */}
            {!originalImage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="mb-8"
              >
                <div className="border-2 border-dashed border-[var(--border)] rounded-lg p-8 text-center">
                  <div className="material-symbols-outlined text-6xl text-[var(--text-secondary)] mb-4">
                    cloud_upload
                  </div>
                  <h3 className="text-xl font-semibold mb-2">Upload an Image</h3>
                  <p className="text-[var(--text-secondary)] mb-4">
                    Select an image to start inpainting
                  </p>
                  <label className="inline-flex items-center px-6 py-3 bg-[var(--accent-primary)] text-white rounded-lg cursor-pointer hover:bg-opacity-90 transition-colors">
                    <span className="material-symbols-outlined mr-2">add_photo_alternate</span>
                    Choose Image
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
              </motion.div>
            )}

            {/* Main Interface */}
            {originalImage && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="grid grid-cols-1 lg:grid-cols-4 gap-6"
              >
                {/* Tools Panel */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Model Status */}
                  <div className="bg-[var(--surface-primary)] p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center">
                      <span className="material-symbols-outlined mr-2">psychology</span>
                      Model Status
                    </h3>
                    <div className={`flex items-center ${modelLoaded ? 'text-green-500' : 'text-yellow-500'}`}>
                      <div className={`w-3 h-3 rounded-full mr-2 ${modelLoaded ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      {modelLoaded ? 'AOT-GAN Ready' : 'Loading Model...'}
                    </div>
                  </div>

                  {/* Brush Controls */}
                  <div className="bg-[var(--surface-primary)] p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center">
                      <span className="material-symbols-outlined mr-2">brush</span>
                      Brush Settings
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Brush Size: {brushSize}px
                        </label>
                        <input
                          type="range"
                          min="5"
                          max="100"
                          value={brushSize}
                          onChange={(e) => setBrushSize(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <button
                        onClick={clearMask}
                        className="w-full px-4 py-2 bg-[var(--accent-secondary)] text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined mr-2">clear</span>
                        Clear Mask
                      </button>
                    </div>
                  </div>

                  {/* View Controls */}
                  <div className="bg-[var(--surface-primary)] p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center">
                      <span className="material-symbols-outlined mr-2">zoom_in</span>
                      View Controls
                    </h3>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Zoom: {Math.round(zoom * 100)}%
                        </label>
                        <input
                          type="range"
                          min="0.1"
                          max="5"
                          step="0.1"
                          value={zoom}
                          onChange={(e) => setZoom(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                      <button
                        onClick={resetPosition}
                        className="w-full px-4 py-2 bg-[var(--surface-secondary)] text-[var(--text-primary)] rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined mr-2">center_focus_strong</span>
                        Reset Position
                      </button>
                    </div>
                  </div>

                  {/* History Controls */}
                  <div className="bg-[var(--surface-primary)] p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center">
                      <span className="material-symbols-outlined mr-2">history</span>
                      History
                    </h3>
                    <div className="flex space-x-2">
                      <button
                        onClick={undo}
                        disabled={historyIndex <= 0}
                        className="flex-1 px-4 py-2 bg-[var(--surface-secondary)] text-[var(--text-primary)] rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined mr-1">undo</span>
                        Undo
                      </button>
                      <button
                        onClick={redo}
                        disabled={historyIndex >= history.length - 1}
                        className="flex-1 px-4 py-2 bg-[var(--surface-secondary)] text-[var(--text-primary)] rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        <span className="material-symbols-outlined mr-1">redo</span>
                        Redo
                      </button>
                    </div>
                  </div>

                  {/* Processing Controls */}
                  <div className="bg-[var(--surface-primary)] p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 flex items-center">
                      <span className="material-symbols-outlined mr-2">auto_fix_high</span>
                      Processing
                    </h3>
                    <div className="space-y-3">
                      <button
                        onClick={startInpainting}
                        disabled={isProcessing || !modelLoaded}
                        className="w-full px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:bg-opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                      >
                        {isProcessing ? (
                          <>
                            <div className="animate-spin mr-2 w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            Processing...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined mr-2">auto_fix_high</span>
                            Start Inpainting
                          </>
                        )}
                      </button>
                      
                      {processedImage && (
                        <button
                          onClick={downloadResult}
                          className="w-full px-4 py-2 bg-[var(--accent-tertiary)] text-white rounded-lg hover:bg-opacity-90 transition-colors flex items-center justify-center"
                        >
                          <span className="material-symbols-outlined mr-2">download</span>
                          Download Result
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Comparison Slider */}
                  {processedImage && (
                    <div className="bg-[var(--surface-primary)] p-4 rounded-lg">
                      <h3 className="font-semibold mb-3 flex items-center">
                        <span className="material-symbols-outlined mr-2">compare</span>
                        Comparison
                      </h3>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Original ← → Result
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={showComparison}
                          onChange={(e) => setShowComparison(Number(e.target.value))}
                          className="w-full"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Canvas Area */}
                <div className="lg:col-span-3">
                  <div 
                    ref={containerRef}
                    className="relative bg-[var(--surface-primary)] rounded-lg overflow-hidden"
                    style={{ height: '600px' }}
                  >
                    {/* Canvas Container */}
                    <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
                      <div className="relative" style={canvasStyle}>
                        {/* Original Image Canvas */}
                        <canvas
                          ref={canvasRef}
                          className="absolute top-0 left-0 max-w-full max-h-full object-contain"
                          style={{
                            ...comparisonStyle,
                            clipPath: processedImage ? `inset(0 ${100 - showComparison}% 0 0)` : undefined
                          }}
                        />
                        
                        {/* Processed Image Canvas (shown when comparison slider moves) */}
                        {processedImage && (
                          <canvas
                            className="absolute top-0 left-0 max-w-full max-h-full object-contain"
                            width={processedImage.width}
                            height={processedImage.height}
                            style={{
                              clipPath: `inset(0 0 0 ${showComparison}%)`
                            }}
                            ref={(canvas) => {
                              if (canvas && processedImage) {
                                const ctx = canvas.getContext('2d');
                                if (ctx) {
                                  ctx.clearRect(0, 0, canvas.width, canvas.height);
                                  ctx.drawImage(processedImage, 0, 0);
                                }
                              }
                            }}
                          />
                        )}
                        
                        {/* Mask Canvas (overlay) */}
                        <canvas
                          ref={maskCanvasRef}
                          className="absolute top-0 left-0 max-w-full max-h-full object-contain opacity-50"
                          style={{ mixBlendMode: 'multiply' }}
                          onMouseDown={startPainting}
                          onMouseMove={paint}
                          onMouseUp={stopPainting}
                          onMouseLeave={stopPainting}
                        />
                      </div>
                    </div>

                    {/* Comparison Line */}
                    {processedImage && (
                      <div
                        className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10"
                        style={{ left: `${showComparison}%` }}
                      >
                        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-white rounded-full shadow-lg flex items-center justify-center">
                          <span className="material-symbols-outlined text-sm text-gray-600">
                            drag_indicator
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Instructions */}
                  <div className="mt-4 text-sm text-[var(--text-secondary)] text-center">
                    <p className="mb-2">
                      <strong>Instructions:</strong> Paint over areas you want to remove or fill in, then click "Start Inpainting"
                    </p>
                    <p>
                      Use mouse wheel to zoom, drag to pan, or use the controls on the left
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </main>

        <Footer />
      </div>

      {/* Hidden canvas for processing */}
      <canvas ref={previewCanvasRef} className="hidden" />

      {/* Loading overlay */}
      {isProcessing && (
        <LoadingOverlay
          message="Processing with AOT-GAN..."
          progress={undefined}
        />
      )}
    </div>
  );
};

export default InpaintingPage; 