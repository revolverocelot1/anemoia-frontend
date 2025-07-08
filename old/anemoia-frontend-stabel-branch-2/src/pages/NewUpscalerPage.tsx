import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '../components/Header';
import Footer from '../components/Footer';
import UpscalerInput from '../components/upscaler/UpscalerInput';
import UpscalerOutput from '../components/upscaler/UpscalerOutput';
import ProcessingOverlay from '../components/upscaler/ProcessingOverlay';
import AnimatedPage from '../components/AnimatedPage';

type UpscalerView = 'input' | 'processing' | 'output';

// Utility to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const NewUpscalerPage: React.FC = () => {
  const [view, setView] = useState<UpscalerView>('input');
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [upscaledImageUrl, setUpscaledImageUrl] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const workerRef = useRef<Worker | null>(null);

  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/upscaler.worker.ts', import.meta.url), { type: 'module' });
    workerRef.current.postMessage({ command: 'initialize' });

    workerRef.current.onmessage = (event: MessageEvent) => {
      const { status, message, error: workerError, upscaledImageUrl: workerUpscaledUrl, stats: workerStats, progress: workerProgress } = event.data;

      if (message) setStatusMessage(message);
      if (workerProgress !== undefined) setProgress(workerProgress);
      
      switch (status) {
        case 'worker_initialized':
          console.log('Upscaler worker is ready.');
          break;
        case 'model_loading':
        case 'processing':
          setView('processing');
          break;
        case 'complete':
          if (workerUpscaledUrl && workerStats) {
            setUpscaledImageUrl(workerUpscaledUrl);
            setStats(workerStats);
            setView('output');
          }
          break;
        case 'error':
          setError(workerError);
          setView('input'); 
          break;
      }
    };

    return () => workerRef.current?.terminate();
  }, []);

  const handleImageUpload = (file: File, scaleFactor: number, modelType: string) => {
    setOriginalImage(file);
    setError(null);
    setProgress(0);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = {
        dataUrl: e.target?.result as string,
        width: 0,
        height: 0,
        originalFileSize: formatFileSize(file.size)
      };

      const img = new Image();
      img.onload = () => {
        imageData.width = img.width;
        imageData.height = img.height;
        
        workerRef.current?.postMessage({
          command: 'upscale',
          imageData,
          scaleFactor,
          modelType,
          backend: 'webgl'
        });
      };
      img.src = imageData.dataUrl;
    };
    reader.readAsDataURL(file);
    
    setView('processing');
    setStatusMessage('Preparing image...');
  };

  const handleReset = () => {
    setView('input');
    setOriginalImage(null);
    setUpscaledImageUrl('');
    setStats(null);
    setError(null);
    setProgress(0);
    setStatusMessage('');
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
              <UpscalerInput onImageUploaded={handleImageUpload} isProcessing={false} />
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
              <UpscalerOutput
                originalImageFile={originalImage}
                upscaledImageUrl={upscaledImageUrl}
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

export default NewUpscalerPage;
