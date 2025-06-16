import React, { useState, useRef, useEffect } from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import UpscalerInputView from '../components/upscaler/UpscalerInputView';
import UpscalerOutputView from '../components/upscaler/UpscalerOutputView';

export type UpscalerView = 'input' | 'output';

const NewUpscalerPage: React.FC = () => {
  const [currentView, setCurrentView] = useState<UpscalerView>('input');
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [upscaledImageUrl, setUpscaledImageUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  // const [selectedScaleFactor, setSelectedScaleFactor] = useState<number>(4); // Removed
  const [statusMessage, setStatusMessage] = useState<string>('');
  // Add more state as needed: error, progress, stats etc.

  const upscalerWorkerRef = useRef<Worker | null>(null);

  useEffect(() => {
    upscalerWorkerRef.current = new Worker(new URL('../workers/upscaler.worker.ts', import.meta.url), { type: 'module' });

    upscalerWorkerRef.current.onmessage = (event: MessageEvent) => {
      const { status, message, error, upscaledImageUrl: workerUpscaledUrl, stats } = event.data;
      setStatusMessage(message || error || status);

      switch (status) {
        case 'worker_initialized':
          setIsProcessing(false);
          break;
        case 'model_loading':
          setIsProcessing(true);
          break;
        case 'processing':
          setIsProcessing(true);
          break;
        case 'complete':
          setIsProcessing(false);
          if (workerUpscaledUrl) {
            handleUpscaleComplete(workerUpscaledUrl, stats);
          }
          break;
        case 'error':
          setIsProcessing(false);
          // TODO: Display error to user more formally
          console.error("Upscaler Worker Error:", error);
          break;
      }
    };

    // Optional: Send initialize message if your worker needs it
    // upscalerWorkerRef.current.postMessage({ command: 'initialize' });

    return () => {
      upscalerWorkerRef.current?.terminate();
    };
  }, []);


  // Placeholder functions
  const handleImageUploaded = (file: File, sf: number) => {
    setOriginalImage(file);
    // setSelectedScaleFactor(sf); // Removed
    setIsProcessing(true);
    setStatusMessage('Preparing image...'); // Initial status

    // Create a simplified representation for the worker for now
    // A real implementation would send ImageData or an ImageBitmap
    // For this placeholder, the worker doesn't actually use 'imageData' content
    // but it's good to simulate a bit more realistically.
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const imageRepresentation = {
                name: file.name,
                type: file.type,
                width: img.width,
                height: img.height,
            };
            upscalerWorkerRef.current?.postMessage({
                command: 'upscale',
                imageData: imageRepresentation, // Send file or its data
                scaleFactor: sf,
                backend: 'webgl' // Add this line, defaulting to webgl for now
            });
        };
        img.src = e.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleUpscaleComplete = (url: string, stats: any) => {
    setUpscaledImageUrl(url);
    // setStats(stats); // You would set stats state here if you have one
    console.log("Upscale complete, stats:", stats);
    setCurrentView('output');
  };

  const handleReset = () => {
    setOriginalImage(null);
    setUpscaledImageUrl(null);
    setCurrentView('input');
    setIsProcessing(false);
    setStatusMessage('');
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-x-hidden">
      <div className="layout-container flex h-full grow flex-col">
        <Header />
        <main className="px-4 sm:px-10 md:px-20 lg:px-40 flex flex-1 justify-center py-12">
          <div className="layout-content-container flex flex-col items-center w-full max-w-4xl flex-1">
            {currentView === 'input' && (
              <UpscalerInputView
                onImageUploaded={handleImageUploaded} // Already correctly passes (file, sf)
                isProcessing={isProcessing}
                // Pass other necessary props like error state, statusMessage
              />
            )}
            {currentView === 'output' && originalImage && upscaledImageUrl && (
              <UpscalerOutputView
                originalImageFile={originalImage}
                upscaledImageUrl={upscaledImageUrl}
                onReset={handleReset}
                // Pass stats, etc.
              />
            )}
             {/* Display status messages */}
             {isProcessing && statusMessage && (
              <div className="mt-4 text-center text-[var(--text-secondary)]">
                <p>{statusMessage}</p>
                {/* Optional: add a spinner here */}
              </div>
            )}
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default NewUpscalerPage;
