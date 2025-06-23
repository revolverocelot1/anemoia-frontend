import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import ModelStatusIndicator from '../components/ModelStatusIndicator';

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

interface ModelInfo {
  initialized: boolean;
  modelLoaded: boolean;
  gpuInfo: any | null;
  currentModel: string;
  availableModels?: Array<{
    name: string;
    displayName: string;
    description: string;
  }>;
  performanceStats: {
    lastInferenceTime: number;
    averageTime: number;
    totalInferences: number;
  };
  hasNeuralAcceleration: boolean;
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

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [currentStroke, setCurrentStroke] = useState<StrokePoint[]>([]);
  const [modelInfo, setModelInfo] = useState<ModelInfo>({ 
    initialized: false, 
    modelLoaded: false, 
    gpuInfo: null, 
    currentModel: '', 
    performanceStats: { lastInferenceTime: 0, averageTime: 0, totalInferences: 0 },
    hasNeuralAcceleration: false 
  });
  const [initProgress, setInitProgress] = useState(0);
  const [modelLoadProgress, setModelLoadProgress] = useState(0);
  const [processingProgress, setProcessingProgress] = useState(0);

  // Model selection
  const [selectedModel, setSelectedModel] = useState<'mi-gan' | 'aot-gan' | 'auto'>('auto');
  const [showModelSelector, setShowModelSelector] = useState(false);

  // Worker ref
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker
  useEffect(() => {
    const initializeWorker = async () => {
      setInitProgress(0);
      
      workerRef.current = new Worker(
        new URL('../workers/inpainting.worker.ts', import.meta.url), 
        { type: 'module' }
      );

      workerRef.current.onmessage = (event) => {
        const { type, data, error, progress } = event.data;
        
        switch (type) {
          case 'INIT_PROGRESS':
            setInitProgress(progress || 0);
            if (data) {
              setModelInfo(data);
            }
            break;
          case 'INIT_COMPLETE':
            setModelInfo(data);
            console.log('✅ Worker initialized successfully');
            break;
          case 'MODEL_LOADING_PROGRESS':
            setModelLoadProgress(data.progress || 0);
            break;
          case 'MODEL_LOADED':
            setModelInfo(data);
            setModelLoadProgress(100);
            console.log('✅ Model loaded successfully');
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
            console.error('❌ Inpainting error:', error);
            break;
          default:
            console.log('Worker message:', type, data);
        }
      };

      // Initialize the worker
      workerRef.current.postMessage({ type: 'INIT' });
    };

    initializeWorker();

    return () => {
      workerRef.current?.terminate();
    };
  }, []);

  // Canvas setup
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

    // Calculate optimal canvas size
    const containerRect = container.getBoundingClientRect();
    const maxWidth = containerRect.width - 40;
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

    // Set canvas dimensions
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

    // Clear mask
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);

    // Reset view
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
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
    if (event.button !== 0) return;
    
    const point = getCanvasPoint(event);
    setIsPainting(true);
    setCurrentStroke([point]);
    drawBrushStroke(point, point);
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
    ctx.strokeStyle = 'rgba(255, 0, 0, 0.7)';
    
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

  const loadModel = useCallback(async (modelName: 'mi-gan' | 'aot-gan' | 'auto') => {
    if (!workerRef.current) return;

    setModelLoadProgress(0);
    setSelectedModel(modelName);
    
    workerRef.current.postMessage({
      type: 'LOAD_MODEL',
      data: { modelName }
    });
  }, []);

  const startInpainting = useCallback(async () => {
    if (!originalImage || !canvasRef.current || !maskCanvasRef.current || !workerRef.current) return;

    setIsProcessing(true);
    setProcessingProgress(0);

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    
    const imageData = canvas.getContext('2d')?.getImageData(0, 0, canvas.width, canvas.height);
    const maskData = maskCanvas.getContext('2d')?.getImageData(0, 0, maskCanvas.width, maskCanvas.height);

    if (!imageData || !maskData) {
      setIsProcessing(false);
      return;
    }

    workerRef.current.postMessage({
      type: 'INPAINT',
      data: {
        imageData: imageData,
        maskData: maskData,
        options: {
          model: selectedModel,
          quality: 'balanced',
          preserveDetails: true
        }
      }
    });
  }, [originalImage, selectedModel]);

  const handleInpaintingComplete = useCallback((resultImageData: ImageData) => {
    if (!previewCanvasRef.current) return;

    const canvas = previewCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = resultImageData.width;
    canvas.height = resultImageData.height;
    ctx.putImageData(resultImageData, 0, 0);

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
  }, [undo, redo]);

  const canvasStyle = useMemo(() => ({
    transform: `scale(${zoom}) translate(${panOffset.x}px, ${panOffset.y}px)`,
    transformOrigin: 'center center',
    cursor: isPainting ? 'crosshair' : 'grab',
    transition: 'transform 0.2s ease'
  }), [zoom, panOffset, isPainting]);

  const isSystemReady = modelInfo.initialized;
  const hasValidMask = history.length > 0;
  const canProcess = originalImage && hasValidMask && isSystemReady && !isProcessing;

  return (
    <div className="relative flex size-full min-h-screen flex-col bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      <main className="flex-1 relative">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-6 px-4"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            AI Inpainting Studio
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-4">
            Remove objects and fill missing areas with state-of-the-art AI models
          </p>
          
          {/* GPU Status */}
          <div className="flex justify-center mb-4">
            <ModelStatusIndicator 
              isLoading={initProgress < 100} 
              modelInfo={modelInfo.initialized ? modelInfo : null} 
            />
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
              className="flex-1 flex flex-col h-[calc(100vh-180px)]"
            >
              {/* Controls Bar */}
              <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between max-w-7xl mx-auto">
                  
                  {/* Left Controls */}
                  <div className="flex items-center space-x-4">
                    
                    {/* Model Selector */}
                    <div className="relative">
                      <button
                        onClick={() => setShowModelSelector(!showModelSelector)}
                        className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-lg">psychology</span>
                        <span className="font-medium">
                          {selectedModel === 'auto' ? 'Auto Select' : 
                           selectedModel === 'mi-gan' ? 'MI-GAN' : 'AOT-GAN'}
                        </span>
                        <span className="material-symbols-outlined text-sm">expand_more</span>
                      </button>
                      
                      <AnimatePresence>
                        {showModelSelector && (
                          <motion.div
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-50"
                          >
                            <div className="p-4">
                              <h3 className="text-lg font-semibold mb-3">Select AI Model</h3>
                              
                              {/* Auto Selection */}
                              <button
                                onClick={() => {
                                  loadModel('auto');
                                  setShowModelSelector(false);
                                }}
                                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                                  selectedModel === 'auto' 
                                    ? 'bg-blue-100 dark:bg-blue-900/20 border-2 border-blue-500' 
                                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <span className="material-symbols-outlined text-blue-500">auto_awesome</span>
                                  <div>
                                    <div className="font-medium">Auto Select</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                      Automatically choose the best model for your GPU
                                    </div>
                                  </div>
                                </div>
                              </button>

                              {/* MI-GAN Option */}
                              <button
                                onClick={() => {
                                  loadModel('mi-gan');
                                  setShowModelSelector(false);
                                }}
                                className={`w-full text-left p-3 rounded-lg mb-2 transition-colors ${
                                  selectedModel === 'mi-gan' 
                                    ? 'bg-green-100 dark:bg-green-900/20 border-2 border-green-500' 
                                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <span className="material-symbols-outlined text-green-500">phone_android</span>
                                  <div>
                                    <div className="font-medium">MI-GAN Mobile</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                      Optimized for mobile/integrated graphics • Fast processing
                                    </div>
                                  </div>
                                </div>
                              </button>

                              {/* AOT-GAN Option */}
                              <button
                                onClick={() => {
                                  loadModel('aot-gan');
                                  setShowModelSelector(false);
                                }}
                                className={`w-full text-left p-3 rounded-lg transition-colors ${
                                  selectedModel === 'aot-gan' 
                                    ? 'bg-purple-100 dark:bg-purple-900/20 border-2 border-purple-500' 
                                    : 'bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600'
                                }`}
                              >
                                <div className="flex items-center space-x-3">
                                  <span className="material-symbols-outlined text-purple-500">gaming_desktop</span>
                                  <div>
                                    <div className="font-medium">AOT-GAN High Quality</div>
                                    <div className="text-sm text-gray-600 dark:text-gray-300">
                                      Best quality for dedicated GPUs • Complex inpainting tasks
                                    </div>
                                  </div>
                                </div>
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Brush Size */}
                    <div className="flex items-center space-x-3">
                      <span className="material-symbols-outlined text-gray-600 dark:text-gray-300">brush</span>
                      <input
                        type="range"
                        min="5"
                        max="100"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-24"
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-300 min-w-[35px]">
                        {brushSize}px
                      </span>
                    </div>

                    {/* Action Buttons */}
                    <button
                      onClick={undo}
                      disabled={historyIndex <= 0}
                      className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Undo (Ctrl+Z)"
                    >
                      <span className="material-symbols-outlined text-lg">undo</span>
                    </button>

                    <button
                      onClick={redo}
                      disabled={historyIndex >= history.length - 1}
                      className="p-2 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      title="Redo (Ctrl+Y)"
                    >
                      <span className="material-symbols-outlined text-lg">redo</span>
                    </button>

                    <button
                      onClick={clearMask}
                      className="p-2 bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-200 dark:hover:bg-red-900/40 transition-colors"
                      title="Clear All Marks"
                    >
                      <span className="material-symbols-outlined text-lg">clear_all</span>
                    </button>
                  </div>

                  {/* Right Controls - Main Action */}
                  <div className="flex items-center space-x-4">
                    
                    {/* Process Button */}
                    <motion.button
                      onClick={startInpainting}
                      disabled={!canProcess}
                      className={`flex items-center space-x-3 px-8 py-3 rounded-xl font-semibold text-lg transition-all duration-300 transform ${
                        canProcess
                          ? 'bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white shadow-lg hover:shadow-xl hover:scale-105'
                          : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
                      }`}
                      whileHover={canProcess ? { scale: 1.05 } : {}}
                      whileTap={canProcess ? { scale: 0.98 } : {}}
                    >
                      {isProcessing ? (
                        <>
                          <div className="animate-spin w-6 h-6 border-2 border-white border-t-transparent rounded-full" />
                          <span>Processing...</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-xl">auto_fix_high</span>
                          <span>Start Inpainting</span>
                        </>
                      )}
                    </motion.button>

                    {processedImage && (
                      <motion.button
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        onClick={downloadResult}
                        className="flex items-center space-x-2 px-6 py-3 bg-purple-500 hover:bg-purple-600 text-white rounded-xl transition-all duration-200 shadow-lg"
                      >
                        <span className="material-symbols-outlined">download</span>
                        <span>Download</span>
                      </motion.button>
                    )}
                  </div>
                </div>
              </div>

              {/* Canvas Area */}
              <div className="flex-1 relative bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
                <div 
                  ref={containerRef}
                  className="h-full overflow-hidden relative"
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
                      
                      {/* Mask Canvas */}
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

                  {/* Comparison Slider */}
                  {processedImage && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 min-w-[300px]">
                      <div className="text-center mb-2">
                        <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                          Compare Results
                        </span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="text-xs text-gray-500">Original</span>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={showComparison}
                          onChange={(e) => setShowComparison(Number(e.target.value))}
                          className="flex-1 h-2 bg-gradient-to-r from-red-200 to-green-200 dark:from-red-800 dark:to-green-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-500">Result</span>
                      </div>
                    </div>
                  )}

                  {/* Instructions */}
                  {!processedImage && (
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-6 py-3 rounded-xl backdrop-blur-sm">
                      <p className="text-sm text-center">
                        <span className="font-semibold">Paint</span> over areas to remove • 
                        <span className="font-semibold"> Adjust brush size</span> as needed • 
                        <span className="font-semibold"> Click "Start Inpainting"</span> when ready
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />

      {/* Hidden canvas for processing */}
      <canvas ref={previewCanvasRef} className="hidden" />

      {/* Loading Overlays */}
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
                  <h3 className="text-xl font-bold mb-2">
                    {modelInfo.currentModel || 'AI Processing'}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-300">
                    Analyzing and reconstructing your image...
                  </p>
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

      {/* Model Loading */}
      <AnimatePresence>
        {modelLoadProgress > 0 && modelLoadProgress < 100 && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 z-40 min-w-[300px]"
          >
            <div className="flex items-center space-x-3">
              <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full" />
              <div className="flex-1">
                <div className="text-sm font-medium mb-1">Loading Model...</div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${modelLoadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default InpaintingPage; 