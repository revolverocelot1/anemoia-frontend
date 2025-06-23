import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import { GPUDetector } from '../utils/gpuDetection';

interface Point {
  x: number;
  y: number;
  label?: 1 | 0;
}

type Tool = 'inpainting' | 'face-restoration' | 'background-removal' | 'segmentation';

const AIToolsPage = () => {
  // Core state
  const [activeTool, setActiveTool] = useState<Tool>('inpainting');
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImage, setProcessedImage] = useState<HTMLImageElement | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [gpuInfo, setGpuInfo] = useState<any>(null);

  // Canvas refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  // Tool-specific state
  const [brushSize, setBrushSize] = useState(25);
  const [isPainting, setIsPainting] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('lama');
  const [segmentationPoints, setSegmentationPoints] = useState<Point[]>([]);
  const [showMask, setShowMask] = useState(false);

  // Worker refs
  const inpaintingWorkerRef = useRef<Worker | null>(null);
  const faceRestorationWorkerRef = useRef<Worker | null>(null);
  const backgroundRemovalWorkerRef = useRef<Worker | null>(null);
  const segmentationWorkerRef = useRef<Worker | null>(null);

  // Initialize GPU detection and workers
  useEffect(() => {
    const initializeSystem = async () => {
      try {
        const detector = GPUDetector.getInstance();
        const info = await detector.detectGPU();
        setGpuInfo(info);

        // Initialize workers
        initializeWorkers();
      } catch (error) {
        console.error('Failed to initialize AI tools:', error);
      }
    };

    initializeSystem();

    return () => {
      // Cleanup workers
      cleanupWorkers();
    };
  }, []);

  const initializeWorkers = () => {
    // Inpainting worker
    inpaintingWorkerRef.current = new Worker(
      new URL('../workers/inpainting.worker.ts', import.meta.url),
      { type: 'module' }
    );
    inpaintingWorkerRef.current.onmessage = handleInpaintingMessage;

    // Face restoration worker
    faceRestorationWorkerRef.current = new Worker(
      new URL('../workers/faceRestoration.worker.ts', import.meta.url),
      { type: 'module' }
    );
    faceRestorationWorkerRef.current.onmessage = handleFaceRestorationMessage;

    // Background removal worker
    backgroundRemovalWorkerRef.current = new Worker(
      new URL('../workers/backgroundRemoval.worker.ts', import.meta.url),
      { type: 'module' }
    );
    backgroundRemovalWorkerRef.current.onmessage = handleBackgroundRemovalMessage;

    // Segmentation worker
    segmentationWorkerRef.current = new Worker(
      new URL('../workers/segmentation.worker.ts', import.meta.url),
      { type: 'module' }
    );
    segmentationWorkerRef.current.onmessage = handleSegmentationMessage;

    // Initialize all workers
    inpaintingWorkerRef.current.postMessage({ type: 'INIT' });
    faceRestorationWorkerRef.current.postMessage({ type: 'INIT' });
    backgroundRemovalWorkerRef.current.postMessage({ type: 'INIT' });
    segmentationWorkerRef.current.postMessage({ type: 'INIT' });
  };

  const cleanupWorkers = () => {
    inpaintingWorkerRef.current?.terminate();
    faceRestorationWorkerRef.current?.terminate();
    backgroundRemovalWorkerRef.current?.terminate();
    segmentationWorkerRef.current?.terminate();
  };

  // Worker message handlers
  const handleInpaintingMessage = (event: MessageEvent) => {
    const { type, data, progress: workerProgress } = event.data;
    
    switch (type) {
      case 'INIT_COMPLETE':
        console.log('🎨 Inpainting worker ready:', data);
        if (data.defaultModel) {
          setSelectedModel(data.defaultModel);
        }
        break;
      case 'INPAINTING_PROGRESS':
        setProgress(workerProgress);
        break;
      case 'INPAINTING_COMPLETE':
        handleProcessingComplete(data);
        break;
      case 'INPAINTING_ERROR':
        handleProcessingError(data.error);
        break;
    }
  };

  const handleFaceRestorationMessage = (event: MessageEvent) => {
    const { type, data, progress: workerProgress } = event.data;
    
    switch (type) {
      case 'RESTORATION_PROGRESS':
        setProgress(workerProgress);
        break;
      case 'RESTORATION_COMPLETE':
        handleProcessingComplete(data);
        break;
      case 'RESTORATION_ERROR':
        handleProcessingError(data.error);
        break;
    }
  };

  const handleBackgroundRemovalMessage = (event: MessageEvent) => {
    const { type, data, progress: workerProgress } = event.data;
    
    switch (type) {
      case 'REMOVAL_PROGRESS':
        setProgress(workerProgress);
        break;
      case 'REMOVAL_COMPLETE':
        handleProcessingComplete(data);
        break;
      case 'REMOVAL_ERROR':
        handleProcessingError(data.error);
        break;
    }
  };

  const handleSegmentationMessage = (event: MessageEvent) => {
    const { type, data } = event.data;
    
    switch (type) {
      case 'SEGMENTATION_COMPLETE':
        handleSegmentationComplete(data);
        break;
      case 'SEGMENTATION_ERROR':
        handleProcessingError(data.error);
        break;
    }
  };

  const handleProcessingComplete = (resultImageData: ImageData) => {
    if (!outputCanvasRef.current) return;

    const canvas = outputCanvasRef.current;
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
      setProgress(100);
    };
    img.src = canvas.toDataURL();
  };

  const handleProcessingError = (error: string) => {
    console.error('Processing error:', error);
    setIsProcessing(false);
    setProgress(0);
    // Show error notification
    showNotification(`Error: ${error}`, 'error');
  };

  const handleSegmentationComplete = (masks: any[]) => {
    if (!masks.length) return;

    // Use the best mask (first one, highest score)
    const bestMask = masks[0];
    handleProcessingComplete(bestMask.mask);
  };

  // Image upload handler
  const handleImageUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setProcessedImage(null);
        setSegmentationPoints([]);
        setupCanvas(img);
        
        // Set image for segmentation worker if needed
        if (activeTool === 'segmentation') {
          const imageData = getImageDataFromImage(img);
          segmentationWorkerRef.current?.postMessage({
            type: 'SET_IMAGE',
            imageData
          });
        }
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  }, [activeTool]);

  const setupCanvas = (img: HTMLImageElement) => {
    if (!canvasRef.current || !maskCanvasRef.current) return;

    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const maskCtx = maskCanvas.getContext('2d');

    if (!ctx || !maskCtx) return;

    // Set canvas size
    canvas.width = img.width;
    canvas.height = img.height;
    maskCanvas.width = img.width;
    maskCanvas.height = img.height;

    // Draw image
    ctx.drawImage(img, 0, 0);
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
  };

  const getImageDataFromImage = (img: HTMLImageElement): ImageData => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    return ctx.getImageData(0, 0, img.width, img.height);
  };

  // Canvas interaction handlers
  const handleCanvasMouseDown = (event: React.MouseEvent) => {
    if (activeTool === 'inpainting') {
      setIsPainting(true);
      const point = getCanvasPoint(event);
      drawBrushStroke(point, point);
    } else if (activeTool === 'segmentation') {
      const point = getCanvasPoint(event);
      const label = event.shiftKey ? 0 : 1; // Shift for negative points
      const newPoint = { ...point, label: label as 1 | 0 };
      setSegmentationPoints(prev => [...prev, newPoint]);
      drawSegmentationPoint(newPoint);
    }
  };

  const handleCanvasMouseMove = (event: React.MouseEvent) => {
    if (activeTool === 'inpainting' && isPainting) {
      const point = getCanvasPoint(event);
      drawBrushStroke(segmentationPoints[segmentationPoints.length - 1] || point, point);
    }
  };

  const handleCanvasMouseUp = () => {
    if (activeTool === 'inpainting') {
      setIsPainting(false);
    }
  };

  const getCanvasPoint = (event: React.MouseEvent): Point => {
    if (!canvasRef.current) return { x: 0, y: 0 };

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  const drawBrushStroke = (from: Point, to: Point) => {
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
  };

  const drawSegmentationPoint = (point: Point) => {
    if (!maskCanvasRef.current) return;

    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = point.label === 1 ? '#00ff00' : '#ff0000';
    ctx.beginPath();
    ctx.arc(point.x, point.y, 8, 0, 2 * Math.PI);
    ctx.fill();
    
    // Add outline
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
  };

  // Processing functions
  const startProcessing = async () => {
    if (!originalImage || !canvasRef.current) return;

    setIsProcessing(true);
    setProgress(0);

    const imageData = getImageDataFromImage(originalImage);

    try {
      switch (activeTool) {
        case 'inpainting':
          await performInpainting(imageData);
          break;
        case 'face-restoration':
          await performFaceRestoration(imageData);
          break;
        case 'background-removal':
          await performBackgroundRemoval(imageData);
          break;
        case 'segmentation':
          await performSegmentation();
          break;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      handleProcessingError(errorMessage);
    }
  };

  const performInpainting = async (imageData: ImageData) => {
    if (!maskCanvasRef.current) return;

    const maskCtx = maskCanvasRef.current.getContext('2d');
    if (!maskCtx) return;

    const maskData = maskCtx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);

    inpaintingWorkerRef.current?.postMessage({
      type: 'INPAINT',
      imageData,
      maskData,
      modelType: selectedModel
    });
  };

  const performFaceRestoration = async (imageData: ImageData) => {
    faceRestorationWorkerRef.current?.postMessage({
      type: 'RESTORE_FACE',
      imageData,
      options: {
        model: 'gfpgan',
        fidelity: 0.7,
        scale: 2
      }
    });
  };

  const performBackgroundRemoval = async (imageData: ImageData) => {
    backgroundRemovalWorkerRef.current?.postMessage({
      type: 'REMOVE_BACKGROUND',
      imageData,
      modelType: selectedModel,
      options: {
        outputType: 'cutout',
        edgeSmoothing: true,
        matting: true
      }
    });
  };

  const performSegmentation = async () => {
    if (segmentationPoints.length === 0) {
      showNotification('Please click on the image to add segmentation points', 'warning');
      setIsProcessing(false);
      return;
    }

    segmentationWorkerRef.current?.postMessage({
      type: 'SEGMENT',
      points: segmentationPoints,
      options: {
        multiMask: false,
        threshold: 0.0
      }
    });
  };

  const clearMask = () => {
    if (!maskCanvasRef.current) return;

    const ctx = maskCanvasRef.current.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    setSegmentationPoints([]);
  };

  const downloadResult = () => {
    if (!processedImage) return;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = processedImage.width;
    canvas.height = processedImage.height;
    ctx.drawImage(processedImage, 0, 0);

    const link = document.createElement('a');
    link.download = `anemoia-${activeTool}-${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png', 1.0);
    link.click();
  };

  const showNotification = (message: string, type: 'success' | 'error' | 'warning' = 'success') => {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 max-w-md p-4 rounded-lg shadow-lg z-50 ${
      type === 'success' ? 'bg-green-500 text-white' :
      type === 'error' ? 'bg-red-500 text-white' :
      'bg-yellow-500 text-black'
    }`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Auto-remove after 3 seconds
    setTimeout(() => notification.remove(), 3000);
  };

  // Tool configurations
  const toolConfigs = {
    inpainting: {
      name: 'AI Inpainting',
      icon: '🎨',
      description: 'Remove unwanted objects and fill missing areas',
      models: ['lama', 'aot-gan'],
      instructions: 'Paint over areas you want to remove with the red brush'
    },
    'face-restoration': {
      name: 'Face Restoration',
      icon: '🧑',
      description: 'Enhance and restore facial details',
      models: ['gfpgan'],
      instructions: 'Upload an image with faces to automatically enhance them'
    },
    'background-removal': {
      name: 'Background Removal',
      icon: '✂️',
      description: 'Remove or replace image backgrounds',
      models: ['u2net', 'rembg'],
      instructions: 'Upload an image to automatically remove the background'
    },
    segmentation: {
      name: 'Smart Selection',
      icon: '🎯',
      description: 'Precisely select objects with AI assistance',
      models: ['tinysam'],
      instructions: 'Click on objects to select them. Hold Shift to subtract areas'
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Hero Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-4">
            AI-Powered Image Tools
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto mb-4">
            Professional-grade AI tools running entirely in your browser with GPU acceleration
          </p>
          
          {/* GPU Status */}
          {gpuInfo && (
            <div className="flex items-center justify-center space-x-4 text-sm">
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  gpuInfo.isDiscrete ? 'bg-green-500' : 'bg-yellow-500'
                } animate-pulse`} />
                <span className="text-gray-600 dark:text-gray-300">
                  {gpuInfo.renderer} • {gpuInfo.backend.toUpperCase()}
                </span>
              </div>
            </div>
          )}
        </motion.div>

        {/* Tool Selection */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Object.entries(toolConfigs).map(([key, config]) => (
            <motion.button
              key={key}
              onClick={() => setActiveTool(key as Tool)}
              className={`p-4 rounded-xl border-2 transition-all duration-300 ${
                activeTool === key
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300'
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <div className="text-2xl mb-2">{config.icon}</div>
              <div className="font-semibold text-sm">{config.name}</div>
            </motion.button>
          ))}
        </div>

        {/* Main Interface */}
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Panel - Controls */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <span className="mr-2">{toolConfigs[activeTool].icon}</span>
                {toolConfigs[activeTool].name}
              </h3>
              
              <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                {toolConfigs[activeTool].description}
              </p>

              {/* Model Selection */}
              {toolConfigs[activeTool].models.length > 1 && (
                <div className="mb-4">
                  <label className="block text-sm font-medium mb-2">Model</label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value)}
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
                  >
                    {toolConfigs[activeTool].models.map(model => (
                      <option key={model} value={model}>
                        {model.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Tool-specific controls */}
              {activeTool === 'inpainting' && (
                <div className="mb-4">
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
              )}

              {/* Upload */}
              <div className="mb-4">
                <label className="block w-full p-4 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-2xl text-gray-400 mb-2 block">
                      cloud_upload
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-300">
                      Choose Image
                    </span>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </label>
              </div>

              {/* Actions */}
              <div className="space-y-2">
                <button
                  onClick={startProcessing}
                  disabled={!originalImage || isProcessing}
                  className="w-full bg-gradient-to-r from-blue-500 to-purple-500 text-white px-4 py-3 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:from-blue-600 hover:to-purple-600 transition-all duration-300"
                >
                  {isProcessing ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                      Processing... {progress}%
                    </div>
                  ) : (
                    `Apply ${toolConfigs[activeTool].name}`
                  )}
                </button>

                <button
                  onClick={clearMask}
                  disabled={!originalImage}
                  className="w-full bg-gray-500 text-white px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  Clear
                </button>

                {processedImage && (
                  <button
                    onClick={downloadResult}
                    className="w-full bg-green-500 text-white px-4 py-2 rounded-lg hover:bg-green-600"
                  >
                    Download Result
                  </button>
                )}
              </div>

              {/* Instructions */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  {toolConfigs[activeTool].instructions}
                </p>
              </div>
            </div>
          </div>

          {/* Right Panel - Canvas Area */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg">
              <div className="relative">
                {originalImage ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Original + Mask */}
                    <div className="relative">
                      <h4 className="text-sm font-medium mb-2">Original</h4>
                      <div className="relative border rounded-lg overflow-hidden">
                        <canvas
                          ref={canvasRef}
                          className="max-w-full h-auto cursor-crosshair"
                          onMouseDown={handleCanvasMouseDown}
                          onMouseMove={handleCanvasMouseMove}
                          onMouseUp={handleCanvasMouseUp}
                        />
                        <canvas
                          ref={maskCanvasRef}
                          className="absolute inset-0 max-w-full h-auto pointer-events-none"
                          style={{ opacity: showMask ? 0.5 : 0.7 }}
                        />
                      </div>
                      
                      <div className="mt-2 flex items-center justify-between">
                        <label className="flex items-center text-sm">
                          <input
                            type="checkbox"
                            checked={showMask}
                            onChange={(e) => setShowMask(e.target.checked)}
                            className="mr-2"
                          />
                          Show overlay
                        </label>
                        
                        {segmentationPoints.length > 0 && (
                          <span className="text-xs text-gray-500">
                            {segmentationPoints.length} point(s)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Result */}
                    <div>
                      <h4 className="text-sm font-medium mb-2">Result</h4>
                      <div className="border rounded-lg overflow-hidden bg-gray-50 dark:bg-gray-700 min-h-[200px] flex items-center justify-center">
                        {processedImage ? (
                          <img
                            src={processedImage.src}
                            alt="Processed"
                            className="max-w-full h-auto"
                          />
                        ) : isProcessing ? (
                          <div className="text-center">
                            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                            <p className="text-sm text-gray-500">Processing...</p>
                            <div className="w-32 h-2 bg-gray-200 rounded-full mt-2">
                              <div
                                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-500 text-sm">Result will appear here</p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <span className="material-symbols-outlined text-6xl text-gray-300 mb-4 block">
                      image
                    </span>
                    <p className="text-gray-500">Upload an image to get started</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Hidden canvas for processing */}
        <canvas ref={outputCanvasRef} className="hidden" />
      </main>

      <Footer />
    </div>
  );
};

export default AIToolsPage; 