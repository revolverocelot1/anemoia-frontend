import React, { useState, useRef, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import Header from '../components/Header';
import { FiEdit, FiSmile, FiScissors, FiCrosshair, FiDownload, FiTrash2, FiUploadCloud } from 'react-icons/fi';

// Types
type Tool = 'inpainting' | 'face-restoration' | 'background-removal' | 'segmentation';
interface Point {
  x: number;
  y: number;
}
interface GPUInfo {
  renderer: string;
  vendor: string;
  tier: 'low' | 'medium' | 'high';
  isDiscrete: boolean;
  backend: string;
}

const AIToolsPage: React.FC = () => {
  const [activeTool, setActiveTool] = useState<Tool>('inpainting');
  const [brushSize, setBrushSize] = useState(40);
  const [originalImage, setOriginalImage] = useState<HTMLImageElement | null>(null);
  const [processedImage, setProcessedImage] = useState<HTMLImageElement | null>(null);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPainting, setIsPainting] = useState(false);
  const [lastPoint, setLastPoint] = useState<Point | null>(null);
  const [progress, setProgress] = useState(0);
  const [gpuInfo, setGpuInfo] = useState<GPUInfo | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const outputCanvasRef = useRef<HTMLCanvasElement>(null);

  const inpaintingWorkerRef = useRef<Worker | null>(null);
  // Refs for other workers can be added here if needed

  useEffect(() => {
    // Initialize workers
    inpaintingWorkerRef.current = new Worker(new URL('../workers/inpainting.worker.ts', import.meta.url), { type: 'module' });
    
    const handleWorkerMessage = (event: MessageEvent) => {
        const { type, data, progress: workerProgress, error } = event.data;
        switch(type) {
            case 'INIT_COMPLETE':
                setGpuInfo(data.gpuInfo);
                break;
            case 'INPAINTING_PROGRESS':
                setProgress(workerProgress);
                break;
            case 'INPAINTING_COMPLETE':
                handleProcessingComplete(data);
                break;
            case 'INPAINTING_ERROR':
                handleProcessingError(error);
                break;
        }
    };
    
    inpaintingWorkerRef.current.onmessage = handleWorkerMessage;
    inpaintingWorkerRef.current.postMessage({ type: 'INIT' });

    return () => {
      inpaintingWorkerRef.current?.terminate();
    };
  }, []);

  const setupCanvas = useCallback((img: HTMLImageElement) => {
    const canvas = canvasRef.current;
    const maskCanvas = maskCanvasRef.current;
    if (!canvas || !maskCanvas) return;

    const aspectRatio = img.width / img.height;
    const container = canvas.parentElement;
    if(!container) return;

    const maxWidth = container.clientWidth;
    const maxHeight = container.clientHeight;

    let newWidth = maxWidth;
    let newHeight = newWidth / aspectRatio;

    if (newHeight > maxHeight) {
      newHeight = maxHeight;
      newWidth = newHeight * aspectRatio;
    }

    canvas.width = newWidth;
    canvas.height = newHeight;
    maskCanvas.width = newWidth;
    maskCanvas.height = newHeight;

    const ctx = canvas.getContext('2d');
    ctx?.drawImage(img, 0, 0, newWidth, newHeight);
  }, []);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        setOriginalImage(img);
        setProcessedImage(null);
        setupCanvas(img);
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (activeTool !== 'inpainting' || !canvasRef.current) return;
    setIsPainting(true);
    const point = getCanvasPoint(e);
    setLastPoint(point);
    drawOnMask(point, point);
  };

  const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isPainting || !canvasRef.current || !lastPoint) return;
    const point = getCanvasPoint(e);
    drawOnMask(lastPoint, point);
    setLastPoint(point);
  };

  const handleCanvasMouseUp = () => {
    setIsPainting(false);
    setLastPoint(null);
  };
  
  const getCanvasPoint = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height)
    };
  };

  const drawOnMask = (from: Point, to: Point) => {
    const maskCtx = maskCanvasRef.current?.getContext('2d');
    if (!maskCtx) return;

    maskCtx.strokeStyle = 'rgba(255, 0, 0, 1)';
    maskCtx.lineWidth = brushSize;
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';

    maskCtx.beginPath();
    maskCtx.moveTo(from.x, from.y);
    maskCtx.lineTo(to.x, to.y);
    maskCtx.stroke();
  };
  
  const handleProcessingComplete = (resultData: ImageData) => {
    setIsProcessing(false);
    setProgress(100);
    
    const canvas = outputCanvasRef.current;
    if(!canvas) return;
    canvas.width = resultData.width;
    canvas.height = resultData.height;
    canvas.getContext('2d')?.putImageData(resultData, 0, 0);

    const image = new Image();
    image.src = canvas.toDataURL();
    image.onload = () => {
        setProcessedImage(image);
        // Display the result on the main canvas
        const mainCtx = canvasRef.current?.getContext('2d');
        if(mainCtx && canvasRef.current) {
            mainCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            mainCtx.drawImage(image, 0, 0, canvasRef.current.width, canvasRef.current.height);
        }
    }
  };
  
  const handleProcessingError = (error: any) => {
      console.error(error);
      setIsProcessing(false);
      // Add user-facing error notification
  };

  const startProcessing = () => {
    if (!originalImage || !canvasRef.current || !maskCanvasRef.current || !inpaintingWorkerRef.current) return;
    
    setIsProcessing(true);
    setProgress(0);

    const mainCanvas = canvasRef.current;
    const mainCtx = mainCanvas.getContext('2d');
    const maskCtx = maskCanvasRef.current.getContext('2d');
    if(!mainCtx || !maskCtx) return;

    // We need to send the original, un-resized image data for best quality
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalImage.naturalWidth;
    tempCanvas.height = originalImage.naturalHeight;
    const tempCtx = tempCanvas.getContext('2d')!;
    tempCtx.drawImage(originalImage, 0, 0);
    const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);
    
    // And scale the mask to match the original image size
    const maskData = maskCtx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);

    inpaintingWorkerRef.current.postMessage({
        type: 'INPAINT',
        imageData,
        maskData
    });
  };
  
  const downloadResult = () => {
    if (!processedImage) return;
    const link = document.createElement('a');
    link.download = `anemoia-result-${Date.now()}.png`;
    link.href = processedImage.src;
    link.click();
  };

  const clearAll = () => {
    const mainCtx = canvasRef.current?.getContext('2d');
    const maskCtx = maskCanvasRef.current?.getContext('2d');

    if(canvasRef.current && mainCtx) {
      mainCtx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
    }
    if(maskCanvasRef.current && maskCtx) {
      maskCtx.clearRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
    }
    setOriginalImage(null);
    setProcessedImage(null);
    setIsProcessing(false);
    setProgress(0);
  };
  
  const toolConfigs = {
    inpainting: { name: 'AI Inpainting', icon: FiEdit, description: 'Remove objects or fill areas.', models: ['lama', 'aot-gan'] },
    'face-restoration': { name: 'Face Restore', icon: FiSmile, description: 'Enhance facial details.', models: ['gfpgan'] },
    'background-removal': { name: 'BG Removal', icon: FiScissors, description: 'Cut out the background.', models: ['u2net', 'rembg'] },
    segmentation: { name: 'Smart Select', icon: FiCrosshair, description: 'Select objects with one click.', models: ['tinysam'] },
  };


  return (
    <div className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <Header />
      <div className="flex flex-grow overflow-hidden">
        {/* Left Toolbar */}
        <aside className="w-20 bg-white dark:bg-gray-800 p-2 flex flex-col items-center space-y-4 shadow-md z-10">
          {Object.entries(toolConfigs).map(([key, config]) => (
            <button
              key={key}
              onClick={() => setActiveTool(key as Tool)}
              className={`p-3 rounded-lg w-full transition-colors duration-200 ${
                activeTool === key ? 'bg-blue-500 text-white' : 'hover:bg-gray-200 dark:hover:bg-gray-700'
              }`}
              title={config.name}
            >
              <config.icon className="w-6 h-6 mx-auto" />
            </button>
          ))}
        </aside>

        {/* Tool Options Sub-panel */}
        <div className="w-64 bg-gray-50 dark:bg-gray-800 p-4 shadow-inner">
           <h3 className="text-lg font-semibold mb-4">{toolConfigs[activeTool].name}</h3>
           <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">{toolConfigs[activeTool].description}</p>
          
          {activeTool === 'inpainting' && (
            <div>
              <label htmlFor="brushSize" className="block text-sm font-medium mb-2">Brush Size ({brushSize}px)</label>
              <input
                type="range"
                id="brushSize"
                min="5"
                max="100"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700"
              />
            </div>
          )}
        </div>

        {/* Main Canvas Area */}
        <main className="flex-grow flex items-center justify-center p-4 bg-gray-200 dark:bg-gray-900/50 relative">
          <div className="relative w-full h-full flex items-center justify-center" onMouseUp={handleCanvasMouseUp}>
             {!originalImage && (
                <div className="text-center text-gray-500">
                    <FiUploadCloud className="mx-auto h-12 w-12" />
                    <h3 className="mt-2 text-sm font-medium">Upload an image</h3>
                    <p className="mt-1 text-sm">Get started by uploading a PNG or JPG.</p>
                </div>
             )}
            <canvas ref={canvasRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-full max-h-full object-contain shadow-lg rounded-md" />
            <canvas 
                ref={maskCanvasRef} 
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 max-w-full max-h-full object-contain opacity-50 cursor-crosshair"
                onMouseDown={handleCanvasMouseDown}
                onMouseMove={handleCanvasMouseMove}
            />
          </div>
        </main>

        {/* Right Action Panel */}
        <aside className="w-72 bg-white dark:bg-gray-800 p-4 flex flex-col space-y-4 shadow-lg">
          <h3 className="text-lg font-semibold">Actions</h3>
          <label htmlFor="image-upload" className="w-full bg-blue-500 text-white text-center py-2 px-4 rounded-md cursor-pointer hover:bg-blue-600 transition-colors flex items-center justify-center">
            <FiUploadCloud className="mr-2"/>
            Upload Image
          </label>
          <input id="image-upload" type="file" className="hidden" accept="image/png, image/jpeg" onChange={handleImageUpload} />

          <button onClick={startProcessing} disabled={isProcessing || !originalImage} className="w-full bg-green-500 text-white py-2 px-4 rounded-md hover:bg-green-600 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed">
            {isProcessing ? `Processing... ${progress}%` : 'Process'}
          </button>
          
          <button onClick={downloadResult} disabled={!processedImage} className="w-full bg-gray-600 text-white py-2 px-4 rounded-md hover:bg-gray-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center">
            <FiDownload className="mr-2"/>
            Download
          </button>
          
          <button onClick={clearAll} className="w-full bg-red-500 text-white py-2 px-4 rounded-md hover:bg-red-600 transition-colors flex items-center justify-center">
            <FiTrash2 className="mr-2"/>
            Clear
          </button>
          
          <canvas ref={outputCanvasRef} className="hidden" />

          {gpuInfo && (
            <div className="border-t dark:border-gray-700 pt-4 mt-auto text-xs text-gray-500 dark:text-gray-400">
                <p className="font-semibold">GPU Status</p>
                <p>{gpuInfo.renderer}</p>
                <p>Backend: {gpuInfo.backend.toUpperCase()}</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
};

export default AIToolsPage;