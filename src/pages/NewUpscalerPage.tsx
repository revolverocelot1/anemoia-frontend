import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import UpscalerInput from '../components/upscaler/UpscalerInput';
import UpscalerOutput from '../components/upscaler/UpscalerOutput';
import ProcessingOverlay from '../components/upscaler/ProcessingOverlay';
import { AnimatePresence } from 'framer-motion';

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
      if (workerProgress) setProgress(workerProgress);
      
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

  const handleImageUpload = (file: File, scaleFactor: number) => {
    setOriginalImage(file);
    setError(null);
    setProgress(0);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      const imageData = {
        dataUrl: e.target?.result as string,
        width: 0, // will be determined from image load
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
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <Header />
      <main className="flex-1 flex justify-center py-12 px-4">
        <div className="w-full max-w-4xl">
          <AnimatePresence mode="wait">
            {view === 'input' && (
              <UpscalerInput onImageUploaded={handleImageUpload} isProcessing={false} />
            )}
            {view === 'output' && originalImage && (
              <UpscalerOutput
                originalImageFile={originalImage}
                upscaledImageUrl={upscaledImageUrl}
                stats={stats}
                onReset={handleReset}
              />
            )}
          </AnimatePresence>
          <AnimatePresence>
            {view === 'processing' && (
              <ProcessingOverlay statusMessage={statusMessage} progress={progress} />
            )}
          </AnimatePresence>
          {error && <div className="text-red-400 text-center mt-4 p-4 bg-red-900/50 rounded-lg">{error}</div>}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default NewUpscalerPage;
