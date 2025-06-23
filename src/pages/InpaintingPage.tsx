import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import InpaintingInput from '../components/inpainting/InpaintingInput';
import InpaintingOutput from '../components/inpainting/InpaintingOutput';
import ProcessingOverlay from '../components/inpainting/ProcessingOverlay';
import AnimatedPage from '../components/AnimatedPage';

type InpaintingView = 'input' | 'processing' | 'output';

const InpaintingPage: React.FC = () => {
  const [view, setView] = useState<InpaintingView>('input');
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [gpuInfo, setGpuInfo] = useState<any>(null);
  const [modelInfo, setModelInfo] = useState<any>(null);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/inpainting.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current.postMessage({ command: 'initialize' });

    workerRef.current.onmessage = (event: MessageEvent) => {
      const { 
        status, 
        message, 
        error: workerError, 
        resultImageData, 
        performanceStats,
        progress: workerProgress,
        gpuInfo: workerGpuInfo,
        modelLoading,
        warnings
      } = event.data;

      if (message) setStatusMessage(message);
      if (workerProgress !== undefined) setProgress(workerProgress);
      if (workerGpuInfo) setGpuInfo(workerGpuInfo);
      if (modelLoading) setModelInfo(modelLoading);
      
      switch (status) {
        case 'worker_initialized':
          console.log('Inpainting worker is ready.');
          break;
        case 'gpu_detected':
          setGpuInfo(workerGpuInfo);
          break;
        case 'model_loading':
          setView('processing');
          setStatusMessage('Loading AI model...');
          break;
        case 'model_loaded':
          setStatusMessage('Model loaded successfully. Processing image...');
          break;
        case 'processing':
          setView('processing');
          break;
        case 'complete':
          if (resultImageData && performanceStats) {
            // Convert ImageData to blob URL
            const canvas = new OffscreenCanvas(resultImageData.width, resultImageData.height);
            const ctx = canvas.getContext('2d')!;
            ctx.putImageData(resultImageData, 0, 0);
            
            canvas.convertToBlob({ type: 'image/png' }).then(blob => {
              const url = URL.createObjectURL(blob);
              setResultImageUrl(url);
              setStats(performanceStats);
              setView('output');
            });
          }
          break;
        case 'error':
          setError(workerError);
          setView('input'); 
          break;
      }

      // Handle warnings
      if (warnings && warnings.length > 0) {
        console.warn('Inpainting warnings:', warnings);
        // You could show these warnings in the UI if desired
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  const handleImageUpload = (file: File, maskData: ImageData, modelType: string) => {
    setOriginalImage(file);
    setError(null);
    setProgress(0);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Create ImageData from the image
        const canvas = new OffscreenCanvas(img.width, img.height);
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        
        workerRef.current?.postMessage({
          command: 'process',
          imageData,
          maskData,
          modelType,
          quality: 'balanced'
        });
      };
      img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
    
    setView('processing');
    setStatusMessage('Preparing image for processing...');
  };

  const handleReset = () => {
    setView('input');
    setOriginalImage(null);
    setResultImageUrl('');
    setStats(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
    setGpuInfo(null);
    setModelInfo(null);
  };

  return (
    <AnimatedPage>
      <div className="relative flex min-h-screen flex-col bg-gray-950 text-white">
        <Header />
        
        <AnimatePresence mode="wait">
          {view === 'input' && (
            <motion.div
              key="input"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
            >
              <InpaintingInput 
                onImageUploaded={handleImageUpload} 
                isProcessing={false} 
              />
            </motion.div>
          )}
        
          {view === 'output' && originalImage && (
            <motion.div
              key="output"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="flex-1"
            >
              <InpaintingOutput
                originalImageFile={originalImage}
                resultImageUrl={resultImageUrl}
                stats={stats}
                onReset={handleReset}
              />
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {view === 'processing' && (
            <ProcessingOverlay 
              statusMessage={statusMessage} 
              progress={progress}
              gpuInfo={gpuInfo}
              modelInfo={modelInfo}
            />
          )}
        </AnimatePresence>

        {error && (
          <motion.div 
            className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-red-500/10 border border-red-500/20 text-red-400 text-center px-6 py-4 rounded-xl backdrop-blur-sm z-50 max-w-md"
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
          >
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>{error}</span>
            </div>
          </motion.div>
        )}

        <Footer />
      </div>
    </AnimatedPage>
  );
};

export default InpaintingPage; 