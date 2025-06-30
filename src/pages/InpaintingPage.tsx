import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import Header from '../components/Header';
import Footer from '../components/Footer';
import InpaintingOutput from '../components/inpainting/InpaintingOutput';
import BrushMaskingCanvas from '../components/inpainting/BrushMaskingCanvas';
import ProcessingOverlay from '../components/inpainting/ProcessingOverlay';

// --- Helper Components & Icons ---

const UploadIcon = () => (
  <svg className="w-16 h-16 mx-auto text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// --- Main Page Component ---
type ProcessingStage = 'upload' | 'mask' | 'processing' | 'result';

const InpaintingPage: React.FC = () => {
  const [stage, setStage] = useState<ProcessingStage>('upload');
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [maskData, setMaskData] = useState<ImageData | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Initializing AI models...');
  const [progress, setProgress] = useState(0);

  // Ready state for simplified demo
  const [inpaintingReady, setInpaintingReady] = useState(false);

  // AOT-GAN worker
  const [workerRef, setWorkerRef] = useState<Worker | null>(null);

  // Initialize workers
  useEffect(() => {
    const worker = new Worker(new URL('../workers/aotgan.worker.ts', import.meta.url), { type: 'module' });
    setWorkerRef(worker);
    
    worker.onmessage = (e) => {
      const { status, message, error: workerError, resultImageData } = e.data;
      
      setStatusMessage(message || statusMessage);

      if (status === 'ready') {
        setInpaintingReady(true);
      }
      
      if (status === 'complete' && resultImageData) {
        const dataUrl = imageDataToDataUrl(resultImageData);
        setResultImageUrl(dataUrl);
        setStats({ modelUsed: 'MI-GAN', acceleration: 'ONNX Runtime (WASM)' });
        setIsProcessing(false);
        setStage('result');
      } else if (status === 'error') {
        setError(workerError || 'An unknown error occurred during inpainting');
        setIsProcessing(false);
        setStage('mask');
      }
    };
    
    return () => worker.terminate();
  }, []);

  const imageDataToDataUrl = (imageData: ImageData) => {
    const canvas = document.createElement('canvas');
    canvas.width = imageData.width;
    canvas.height = imageData.height;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.putImageData(imageData, 0, 0);
      return canvas.toDataURL();
    }
    return '';
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setOriginalImageFile(file);
      setOriginalImageUrl(URL.createObjectURL(file));
      setStage('mask');
      setError(null);
      setMaskData(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg', '.webp'] },
    multiple: false,
    disabled: isProcessing,
  });

  const handleReset = () => {
    setStage('upload');
    setOriginalImageFile(null);
    setOriginalImageUrl(null);
    setResultImageUrl('');
    setStats(null);
    setMaskData(null);
    setError(null);
    setProgress(0);
    setStatusMessage('Initializing AI models...');
  };
  
  const handleProcess = () => {
    if (!originalImageFile || !maskData || !workerRef) {
      setError('Missing image, mask or worker not ready.');
      return;
    }

    setIsProcessing(true);
    setStage('processing');
    setStatusMessage('Preparing image...');
    setProgress(10);
    
    // Get image data from the original file
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      
      setStatusMessage('Sending data to MI-GAN worker...');
      setProgress(30);

      workerRef.postMessage({
        imageData,
        maskData,
      });
    };
    img.onerror = () => {
      setError('Failed to load image for processing.');
      setIsProcessing(false);
      setStage('mask');
    };
    img.src = URL.createObjectURL(originalImageFile);
  };

  const renderContent = () => {
    if (!inpaintingReady) {
        return (
            <div className="text-center">
                <h2 className="text-2xl font-bold mb-4">{statusMessage}</h2>
                <div className="w-20 h-20 mx-auto border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-gray-400 mt-4">Loading inpainting engine...</p>
            </div>
        )
    }

    switch (stage) {
      case 'upload':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI Object Removal
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Fast, responsive brush-based masking. Paint areas to remove with precision control and instant feedback.
              </p>
            </div>
            <div 
              {...getRootProps()} 
              className={`w-full h-96 flex items-center justify-center border-4 border-dashed rounded-2xl cursor-pointer transition-all duration-300 ${
                isDragActive 
                  ? 'border-blue-500 bg-blue-500/10 scale-[1.02]' 
                  : 'border-gray-600 hover:border-gray-500 hover:bg-gray-800/30'
              }`}
            >
              <input {...getInputProps()} />
              <div className="text-center">
                <UploadIcon />
                <p className="mt-4 text-xl font-semibold text-gray-300">
                  {isDragActive ? 'Drop the image here...' : 'Drag & drop an image, or click to select'}
                </p>
                <p className="text-sm text-gray-500 mt-2">PNG, JPG, WebP up to 20MB</p>
              </div>
            </div>
          </div>
        );

      case 'mask':
        if (!originalImageUrl) return null;
        return (
          <div className="w-full max-w-7xl mx-auto">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-white mb-2">Paint the Areas to Remove</h2>
              <p className="text-gray-400">Use the brush to mark areas you want to erase. Use the eraser to refine your selection.</p>
            </div>
            <div className="flex flex-col xl:flex-row gap-6 max-w-full">
              {/* Main Canvas Area */}
              <div className="flex-1 order-2 xl:order-1">
                <BrushMaskingCanvas
                  imageUrl={originalImageUrl}
                  onMaskReady={setMaskData}
                />
              </div>

              {/* Controls Panel */}
              <div className="xl:w-80 order-1 xl:order-2">
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700 sticky top-4">
                    <h3 className="text-lg font-semibold text-gray-300 mb-4">Actions</h3>
                    <div className="space-y-3">
                        <button
                            onClick={handleProcess}
                            disabled={!maskData || isProcessing}
                            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-base shadow-lg"
                        >
                            {isProcessing ? 'Processing...' : 'Erase Painted Areas'}
                        </button>
                        <button
                            onClick={handleReset}
                            className="w-full py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium text-base"
                        >
                            Start Over
                        </button>
                    </div>
                    
                    {/* Quick Tips */}
                    <div className="mt-6 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20">
                      <h4 className="text-sm font-medium text-blue-300 mb-2">💡 Quick Tips</h4>
                      <ul className="text-xs text-blue-200 space-y-1">
                        <li>• Use brush to mark areas for removal</li>
                        <li>• Switch to eraser to refine selection</li>
                        <li>• Adjust brush size with [ ] keys</li>
                        <li>• Ctrl+Z to undo, Ctrl+Y to redo</li>
                      </ul>
                    </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'result':
        if (!originalImageFile) return null;
        return (
          <InpaintingOutput
            originalImageFile={originalImageFile}
            resultImageUrl={resultImageUrl}
            stats={stats}
            onReset={handleReset}
          />
        );

      default:
        return null;
    }
  };

  return (
      <div className="relative flex min-h-screen flex-col bg-gray-950 text-white">
        <Header />
        <main className="flex-1 py-8 px-4">
          <AnimatePresence mode="wait">
              <motion.div
                key={stage}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
                className="w-full min-h-[70vh] flex items-center justify-center"
              >
                {renderContent()}
              </motion.div>
          </AnimatePresence>
        </main>

        <AnimatePresence>
          {stage === 'processing' && (
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
            <p>{error}</p>
            <button onClick={() => setError(null)} className="ml-2 text-red-300 hover:text-red-200">×</button>
          </motion.div>
        )}

        <Footer />
      </div>
  );
};

export default InpaintingPage; 