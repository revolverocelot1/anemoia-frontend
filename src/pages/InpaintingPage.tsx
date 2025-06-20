import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';

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
  const [brushSize, setBrushSize] = useState(25);
  const [showComparison, setShowComparison] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging] = useState(false);

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[]>([]);
  const [modelLoaded, setModelLoaded] = useState(false);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);

  // UI state
  const [showToolPanel, setShowToolPanel] = useState(true);
  const [activeTab, setActiveTab] = useState<'brush' | 'view' | 'history' | 'process'>('brush');

  // Worker ref
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker with enhanced loading feedback
  useEffect(() => {
    const initializeWorker = async () => {
      setModelLoadProgress(10);
      
      workerRef.current = new Worker(
        new URL('../workers/inpainting.worker.ts', import.meta.url), 
        { type: 'module' }
      );

      workerRef.current.onmessage = (event) => {
        const { type, data, error, progress } = event.data;
        
        switch (type) {
          case 'MODEL_LOADED':
            setModelLoaded(true);
            setModelLoadProgress(100);
            console.log('AOT-GAN model loaded successfully');
            break;
          case 'MODEL_LOADING_PROGRESS':
            setModelLoadProgress(data.progress || 0);
            break;
          case 'MODEL_ERROR':
            console.error('Failed to load AOT-GAN model:', error);
            setModelLoadProgress(0);
            break;
          case 'INPAINTING_PROGRESS':
            setProcessingProgress(progress || 0);
            break;
          case 'INPAINTING_COMPLETE':
            handleInpaintingComplete(data);
            setProcessingProgress(100);
            break;
          case 'INPAINTING_ERROR':
            setIsProcessing(false);
            setProcessingProgress(0);
            console.error('Inpainting error:', error);
            break;
        }
      };

      // Simulate progressive loading for the enhanced algorithm
      const loadingSteps = [20, 40, 60, 80, 100];
      for (let i = 0; i < loadingSteps.length; i++) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setModelLoadProgress(loadingSteps[i]);
      }

      // Load the model
      workerRef.current.postMessage({ type: 'LOAD_MODEL' });
    };

    initializeWorker();

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Enhanced canvas setup with proper sizing
  useEffect(() => {
    if (originalImage && canvasRef.current && maskCanvasRef.current && containerRef.current) {
      setupCanvases();
    }
  }, [originalImage]);

  const setupCanvases = useCallback(() => {
    if (!originalImage || !canvasRef.current || !maskCanvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const container = containerRef.current;
    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    if (!ctx || !maskCtx) return;

    // Calculate optimal canvas size to fit container while maintaining aspect ratio
    const containerRect = container.getBoundingClientRect();
    const maxWidth = containerRect.width - 40; // Account for padding
    const maxHeight = containerRect.height - 40;
    
    const imageAspect = originalImage.width / originalImage.height;
    const containerAspect = maxWidth / maxHeight;
    
    let canvasWidth, canvasHeight;
    if (imageAspect > containerAspect) {
      canvasWidth = maxWidth;
      canvasHeight = maxWidth / imageAspect;
    } else {
      canvasHeight = maxHeight;
      canvasWidth = maxHeight * imageAspect;
    }

    // Set canvas size
    canvas.width = originalImage.width;
    canvas.height = originalImage.height;
    canvas.style.width = `${canvasWidth}px`;
    canvas.style.height = `${canvasHeight}px`;
    
    maskCanvas.width = originalImage.width;
    maskCanvas.height = originalImage.height;
    maskCanvas.style.width = `${canvasWidth}px`;
    maskCanvas.style.height = `${canvasHeight}px`;

    // Draw original image
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(originalImage, 0, 0);

    // Clear mask with transparent background
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Reset view
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });

    // Save initial state
    saveHistoryState();
  }, [originalImage]);

  const saveHistoryState = useCallback(() => {
    if (!canvasRef.current || !maskCanvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    const maskCtx = maskCanvasRef.current.getContext('2d');
    if (!ctx || !maskCtx) return;

    const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    const maskData = maskCtx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);

    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ imageData, maskData });
    
    // Limit history to prevent memory issues
    if (newHistory.length > 20) {
      newHistory.shift();
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    
    setHistory(newHistory);
  }, [history, historyIndex]);

  const undo = useCallback(() => {
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
  }, [history, historyIndex]);

  const redo = useCallback(() => {
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
  }, [history, historyIndex]);

  const getCanvasPoint = useCallback((event: React.MouseEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  }, []);

  const startPainting = useCallback((event: React.MouseEvent) => {
    if (event.button !== 0) return; // Only left mouse button
    
    const point = getCanvasPoint(event);
    setIsPainting(true);
    setCurrentStroke([point]);
    drawBrushStroke(point, point);
    
    // Prevent default to avoid scrolling/dragging
    event.preventDefault();
  }, [getCanvasPoint]);

  const paint = useCallback((event: React.MouseEvent) => {
    if (!isPainting) return;

    const point = getCanvasPoint(event);
    const lastPoint = currentStroke[currentStroke.length - 1];
    
    if (lastPoint) {
      drawBrushStroke(lastPoint, point);
      setCurrentStroke(prev => [...prev, point]);
    }
  }, [isPainting, currentStroke, getCanvasPoint]);

  const stopPainting = useCallback(() => {
    if (isPainting) {
      setIsPainting(false);
      setCurrentStroke([]);
      saveHistoryState();
    }
  }, [isPainting, saveHistoryState]);

  const drawBrushStroke = useCallback((from: Point, to: Point) => {
    if (!maskCanvasRef.current) return;

    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.globalCompositeOperation = 'source-over';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)'; // Semi-transparent red for better visibility
    
    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  }, [brushSize]);

  const clearMask = useCallback(() => {
    if (!maskCanvasRef.current) return;

    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    saveHistoryState();
  }, [saveHistoryState]);

  const resetView = useCallback(() => {
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  }, []);

  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
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
  }, []);

  const startInpainting = useCallback(async () => {
    if (!originalImage || !canvasRef.current || !maskCanvasRef.current || !workerRef.current) return;

    setIsProcessing(true);
    setProcessingProgress(0);

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
  }, [originalImage]);

  const handleInpaintingComplete = useCallback((resultImageData: ImageData) => {
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
      setProcessingProgress(100);
    };
    img.src = canvas.toDataURL();
  }, []);

  const downloadResult = useCallback(() => {
    if (!processedImage) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = processedImage.width;
    canvas.height = processedImage.height;
    ctx.drawImage(processedImage, 0, 0);

    const link = document.createElement('a');
    link.download = `anemoia-inpainted-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  }, [processedImage]);

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        undo();
      } else if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
        event.preventDefault();
        redo();
      } else if (event.key === ' ' && !event.ctrlKey && !event.metaKey) {
        event.preventDefault();
        setShowToolPanel(prev => !prev);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  // Enhanced canvas interaction
  const handleWheel = useCallback((event: React.WheelEvent) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prevZoom => Math.max(0.1, Math.min(5, prevZoom * delta)));
  }, []);

  const canvasStyle = useMemo(() => ({
    transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
    transformOrigin: 'center center',
    cursor: isPainting ? 'crosshair' : isDragging ? 'grabbing' : 'grab',
    transition: isDragging ? 'none' : 'transform 0.2s ease'
  }), [zoom, panOffset, isPainting, isDragging]);

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      <main className="flex-1 relative">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-8 px-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            AOT-GAN Image Inpainting
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-2">
            Remove unwanted objects and fill missing areas with state-of-the-art AI
          </p>
          <div className="flex items-center justify-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <div className="flex items-center">
              <div className={`w-2 h-2 rounded-full mr-2 ${modelLoaded ? 'bg-green-500' : 'bg-yellow-500'} animate-pulse`} />
              {modelLoaded ? 'AOT-GAN Ready' : `Loading... ${modelLoadProgress}%`}
            </div>
            <div className="flex items-center">
              <span className="material-symbols-outlined mr-1 text-blue-500">psychology</span>
              Enhanced Algorithm
            </div>
          </div>
        </motion.div>

        {/* Upload Section */}
        <AnimatePresence>
          {!originalImage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="max-w-2xl mx-auto px-4 mb-8"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl border-2 border-dashed border-gray-300 dark:border-gray-600 p-12 text-center hover:border-blue-500 transition-colors duration-300">
                <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <span className="material-symbols-outlined text-2xl text-white">cloud_upload</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">Upload Your Image</h3>
                <p className="text-gray-600 dark:text-gray-300 mb-6">
                  Choose an image to start the inpainting process
                </p>
                <label className="inline-flex items-center px-8 py-4 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl cursor-pointer hover:from-blue-600 hover:to-purple-600 transition-all duration-300 transform hover:scale-105 shadow-lg">
                  <span className="material-symbols-outlined mr-3">add_photo_alternate</span>
                  Choose Image
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                  Supports JPG, PNG, WebP • Max 10MB
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Interface */}
        <AnimatePresence>
          {originalImage && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex-1 flex h-[calc(100vh-200px)]"
            >
              {/* Floating Tool Panel */}
              <AnimatePresence>
                {showToolPanel && (
                  <motion.div
                    initial={{ x: -300, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: -300, opacity: 0 }}
                    className="absolute left-4 top-4 bottom-4 w-80 z-10"
                  >
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 h-full flex flex-col overflow-hidden">
                      {/* Tool Panel Header */}
                      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-bold text-lg">Tools</h3>
                          <button
                            onClick={() => setShowToolPanel(false)}
                            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                          >
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                        
                        {/* Tab Navigation */}
                        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                          {[
                            { id: 'brush', icon: 'brush', label: 'Brush' },
                            { id: 'view', icon: 'zoom_in', label: 'View' },
                            { id: 'history', icon: 'history', label: 'History' },
                            { id: 'process', icon: 'auto_fix_high', label: 'Process' }
                          ].map(tab => (
                            <button
                              key={tab.id}
                              onClick={() => setActiveTab(tab.id as any)}
                              className={`flex-1 flex flex-col items-center py-2 px-3 rounded-md transition-all duration-200 ${
                                activeTab === tab.id 
                                  ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400' 
                                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
                              }`}
                            >
                              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
                              <span className="text-xs mt-1">{tab.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Tool Panel Content */}
                      <div className="flex-1 p-4 overflow-y-auto">
                        <AnimatePresence mode="wait">
                          {activeTab === 'brush' && (
                            <motion.div
                              key="brush"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="space-y-6"
                            >
                              <div>
                                <label className="block text-sm font-semibold mb-3">
                                  Brush Size: {brushSize}px
                                </label>
                                <input
                                  type="range"
                                  min="5"
                                  max="100"
                                  value={brushSize}
                                  onChange={(e) => setBrushSize(Number(e.target.value))}
                                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                  <span>5px</span>
                                  <span>100px</span>
                                </div>
                              </div>
                              
                              <button
                                onClick={clearMask}
                                className="w-full py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2 shadow-lg"
                              >
                                <span className="material-symbols-outlined">clear_all</span>
                                <span>Clear All Marks</span>
                              </button>

                              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
                                <h4 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">How to use:</h4>
                                <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1">
                                  <li>• Paint over areas to remove</li>
                                  <li>• Use larger brush for big areas</li>
                                  <li>• Smaller brush for details</li>
                                  <li>• Click Process when ready</li>
                                </ul>
                              </div>
                            </motion.div>
                          )}

                          {activeTab === 'view' && (
                            <motion.div
                              key="view"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="space-y-6"
                            >
                              <div>
                                <label className="block text-sm font-semibold mb-3">
                                  Zoom: {Math.round(zoom * 100)}%
                                </label>
                                <input
                                  type="range"
                                  min="0.1"
                                  max="5"
                                  step="0.1"
                                  value={zoom}
                                  onChange={(e) => setZoom(Number(e.target.value))}
                                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                                />
                                <div className="flex justify-between text-xs text-gray-500 mt-1">
                                  <span>10%</span>
                                  <span>500%</span>
                                </div>
                              </div>
                              
                              <button
                                onClick={resetView}
                                className="w-full py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2 shadow-lg"
                              >
                                <span className="material-symbols-outlined">center_focus_strong</span>
                                <span>Reset View</span>
                              </button>

                              {processedImage && (
                                <div>
                                  <label className="block text-sm font-semibold mb-3">
                                    Comparison
                                  </label>
                                  <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={showComparison}
                                    onChange={(e) => setShowComparison(Number(e.target.value))}
                                    className="w-full h-2 bg-gradient-to-r from-red-200 to-green-200 dark:from-red-800 dark:to-green-800 rounded-lg appearance-none cursor-pointer slider"
                                  />
                                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                                    <span>Original</span>
                                    <span>Result</span>
                                  </div>
                                </div>
                              )}
                            </motion.div>
                          )}

                          {activeTab === 'history' && (
                            <motion.div
                              key="history"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="space-y-4"
                            >
                              <div className="flex space-x-3">
                                <button
                                  onClick={undo}
                                  disabled={historyIndex <= 0}
                                  className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2 shadow-lg"
                                >
                                  <span className="material-symbols-outlined">undo</span>
                                  <span>Undo</span>
                                </button>
                                <button
                                  onClick={redo}
                                  disabled={historyIndex >= history.length - 1}
                                  className="flex-1 py-3 px-4 bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2 shadow-lg"
                                >
                                  <span className="material-symbols-outlined">redo</span>
                                  <span>Redo</span>
                                </button>
                              </div>
                              
                              <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
                                <div className="text-sm text-gray-600 dark:text-gray-300">
                                  <div className="flex justify-between mb-2">
                                    <span>History Steps:</span>
                                    <span>{history.length}</span>
                                  </div>
                                  <div className="flex justify-between">
                                    <span>Current Step:</span>
                                    <span>{historyIndex + 1}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                <p>Keyboard shortcuts:</p>
                                <p>• Ctrl+Z: Undo</p>
                                <p>• Ctrl+Y: Redo</p>
                                <p>• Space: Toggle panel</p>
                              </div>
                            </motion.div>
                          )}

                          {activeTab === 'process' && (
                            <motion.div
                              key="process"
                              initial={{ opacity: 0, x: 20 }}
                              animate={{ opacity: 1, x: 0 }}
                              exit={{ opacity: 0, x: -20 }}
                              className="space-y-6"
                            >
                              <button
                                onClick={startInpainting}
                                disabled={isProcessing || !modelLoaded}
                                className="w-full py-4 bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed text-white rounded-xl transition-all duration-300 flex items-center justify-center space-x-3 shadow-lg transform hover:scale-105 disabled:transform-none"
                              >
                                {isProcessing ? (
                                  <>
                                    <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                                    <span>Processing...</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="material-symbols-outlined text-xl">auto_fix_high</span>
                                    <span className="font-semibold">Start Inpainting</span>
                                  </>
                                )}
                              </button>

                              {isProcessing && (
                                <motion.div
                                  initial={{ opacity: 0, y: 10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4"
                                >
                                  <div className="flex justify-between text-sm mb-2">
                                    <span>Progress</span>
                                    <span>{processingProgress}%</span>
                                  </div>
                                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <motion.div
                                      className="bg-gradient-to-r from-blue-500 to-green-500 h-2 rounded-full"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${processingProgress}%` }}
                                      transition={{ duration: 0.5 }}
                                    />
                                  </div>
                                </motion.div>
                              )}
                              
                              {processedImage && (
                                <div className="space-y-3">
                                  <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    onClick={downloadResult}
                                    className="w-full py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2 shadow-lg"
                                  >
                                    <span className="material-symbols-outlined">download</span>
                                    <span>Download Result</span>
                                  </motion.button>
                                  
                                  <motion.button
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                    onClick={() => {
                                      setOriginalImage(null);
                                      setProcessedImage(null);
                                      setShowComparison(0);
                                      setHistory([]);
                                      setHistoryIndex(-1);
                                    }}
                                    className="w-full py-3 bg-gray-500 hover:bg-gray-600 text-white rounded-xl transition-colors duration-200 flex items-center justify-center space-x-2 shadow-lg"
                                  >
                                    <span className="material-symbols-outlined">add_photo_alternate</span>
                                    <span>Try New Image</span>
                                  </motion.button>
                                </div>
                              )}

                              <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4">
                                <h4 className="font-semibold text-green-900 dark:text-green-100 mb-2">AOT-GAN Features:</h4>
                                <ul className="text-sm text-green-800 dark:text-green-200 space-y-1">
                                  <li>• Multi-scale context analysis</li>
                                  <li>• Texture-aware synthesis</li>
                                  <li>• Edge-preserving algorithms</li>
                                  <li>• High-quality results</li>
                                </ul>
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Canvas Area */}
              <div className="flex-1 relative">
                {!showToolPanel && (
                  <button
                    onClick={() => setShowToolPanel(true)}
                    className="absolute top-4 left-4 z-10 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 border border-gray-200 dark:border-gray-700"
                  >
                    <span className="material-symbols-outlined text-blue-600 dark:text-blue-400">tune</span>
                  </button>
                )}
                
                <div 
                  ref={containerRef}
                  className="h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden relative"
                  onWheel={handleWheel}
                >
                                        {/* Canvas Container */}
                      <div className="absolute inset-0 flex items-center justify-center p-4">
                        <div className="relative" style={canvasStyle}>
                          {/* Original Image Canvas */}
                          <canvas
                            ref={canvasRef}
                            className="rounded-xl shadow-2xl border-4 border-white dark:border-gray-700"
                            style={{
                              maxWidth: '100%',
                              maxHeight: '100%',
                              clipPath: processedImage ? `inset(0 ${100 - showComparison}% 0 0)` : undefined
                            }}
                          />
                          
                          {/* Processed Image Canvas */}
                          {processedImage && (
                            <canvas
                              className="absolute top-0 left-0 rounded-xl shadow-2xl border-4 border-white dark:border-gray-700"
                              width={processedImage.width}
                              height={processedImage.height}
                              style={{
                                maxWidth: '100%',
                                maxHeight: '100%',
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
                          
                          {/* Mask Canvas - Only show when painting and no processed image */}
                          <canvas
                            ref={maskCanvasRef}
                            className={`absolute top-0 left-0 rounded-xl ${processedImage ? 'opacity-0 pointer-events-none' : 'opacity-50'}`}
                            style={{ 
                              maxWidth: '100%',
                              maxHeight: '100%',
                              mixBlendMode: processedImage ? 'normal' : 'multiply'
                            }}
                            onMouseDown={startPainting}
                            onMouseMove={paint}
                            onMouseUp={stopPainting}
                            onMouseLeave={stopPainting}
                          />
                        </div>
                      </div>

                  {/* Comparison Line */}
                  {processedImage && (
                    <motion.div
                      className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10 rounded-full"
                      style={{ left: `${showComparison}%` }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                    >
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-xl flex items-center justify-center border-2 border-gray-300">
                        <span className="material-symbols-outlined text-sm text-gray-600">drag_indicator</span>
                      </div>
                    </motion.div>
                  )}

                  {/* Instructions Overlay */}
                  <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-6 py-3 rounded-xl backdrop-blur-sm">
                    <p className="text-sm text-center">
                      <span className="font-semibold">Paint</span> over areas to remove • <span className="font-semibold">Scroll</span> to zoom • <span className="font-semibold">Space</span> to toggle tools
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      {/* Hidden canvas for processing */}
      <canvas ref={previewCanvasRef} className="hidden" />

      {/* Enhanced Loading overlay */}
      <AnimatePresence>
        {isProcessing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-800 rounded-2xl p-8 shadow-2xl max-w-md w-full mx-4"
            >
              <div className="text-center">
                <div className="mb-6">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl mx-auto flex items-center justify-center mb-4">
                    <span className="material-symbols-outlined text-2xl text-white animate-pulse">psychology</span>
                  </div>
                  <h3 className="text-xl font-bold mb-2">AOT-GAN Processing</h3>
                  <p className="text-gray-600 dark:text-gray-300">Analyzing and reconstructing your image...</p>
                </div>
                
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Progress</span>
                    <span>{processingProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <motion.div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${processingProgress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                </div>
                
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                  <div className="animate-spin w-4 h-4 border-2 border-gray-300 border-t-blue-500 rounded-full" />
                  <span>This may take a few seconds...</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InpaintingPage; 