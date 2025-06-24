import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import Header from '../components/Header';
import Footer from '../components/Footer';
import InpaintingOutput from '../components/inpainting/InpaintingOutput';
import MaskingCanvas from '../components/inpainting/MaskingCanvas';

// --- Helper Components & Icons ---

const UploadIcon = () => (
  <svg className="w-16 h-16 mx-auto text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48" aria-hidden="true">
    <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const UndoIcon = () => <span className="material-symbols-outlined">undo</span>;
const RedoIcon = () => <span className="material-symbols-outlined">redo</span>;
const ResetIcon = () => <span className="material-symbols-outlined">restart_alt</span>;

// Define the model type
type ModelType = 'auto' | 'mi-gan-mobile' | 'aot-gan';
type ProcessingStage = 'upload' | 'mask' | 'processing' | 'result';

interface ModelSelectorProps {
  selectedModel: ModelType;
  onSelect: (model: ModelType) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onSelect }) => (
  <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
    <h3 className="text-sm font-semibold text-gray-300 mb-3">AI Model</h3>
    <div className="grid grid-cols-1 gap-2">
      {[
        { id: 'auto', name: 'Auto Select', desc: 'Best model for your device' },
        { id: 'mi-gan-mobile', name: 'MI-GAN Mobile', desc: 'Fast processing' },
        { id: 'aot-gan', name: 'AOT-GAN', desc: 'High quality' }
      ].map(model => (
        <button
          key={model.id}
          onClick={() => onSelect(model.id as ModelType)}
          className={`px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 border-2 text-left ${
            selectedModel === model.id
              ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
              : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'
          }`}
        >
          <div className="font-medium">{model.name}</div>
          <div className="text-xs opacity-70">{model.desc}</div>
        </button>
      ))}
    </div>
  </div>
);

// Processing Overlay Component
const ProcessingOverlay = ({ statusMessage, progress }: { statusMessage: string; progress: number }) => (
  <motion.div
    className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
    initial={{ opacity: 0 }}
    animate={{ opacity: 1 }}
    exit={{ opacity: 0 }}
  >
    <div className="bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-700 shadow-2xl">
      <div className="text-center">
        <div className="w-20 h-20 mx-auto mb-6 relative">
          <div className="absolute inset-0 rounded-full border-4 border-gray-600"></div>
          <div 
            className="absolute inset-0 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"
            style={{ animationDuration: progress < 30 ? '1s' : progress < 80 ? '0.8s' : '0.5s' }}
          ></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-xs font-bold text-blue-400">{Math.round(progress)}%</span>
          </div>
        </div>
        
        <h3 className="text-2xl font-bold text-white mb-3">
          {progress < 25 ? 'Initializing AI Engine' : 
           progress < 50 ? 'Processing Image' : 
           progress < 90 ? 'Applying Neural Networks' : 
           'Finalizing Results'}
        </h3>
        
        <p className="text-gray-400 mb-6 min-h-[1.5rem]">{statusMessage}</p>
        
        <div className="w-full bg-gray-700 rounded-full h-3 mb-3 overflow-hidden">
          <motion.div 
            className="h-3 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all duration-500 ease-out relative"
            style={{ width: `${progress}%` }}
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </motion.div>
        </div>
        
        <div className="flex justify-between text-xs text-gray-500 mb-4">
          <span>{Math.round(progress)}% complete</span>
          <span>{progress < 25 ? 'Preparing...' : 
                 progress < 50 ? 'Processing...' : 
                 progress < 90 ? 'Computing...' : 
                 'Almost done!'}</span>
        </div>
        
        {/* Processing stages indicator */}
        <div className="flex justify-center space-x-2">
          {[
            { label: 'Init', threshold: 20 },
            { label: 'Load', threshold: 40 },
            { label: 'Process', threshold: 85 },
            { label: 'Finalize', threshold: 100 }
          ].map((stage, index) => (
            <div key={index} className="flex flex-col items-center">
              <div 
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  progress >= stage.threshold 
                    ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]' 
                    : progress >= stage.threshold - 20 
                    ? 'bg-blue-500 animate-pulse' 
                    : 'bg-gray-600'
                }`}
              />
              <span className="text-xs text-gray-500 mt-1">{stage.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  </motion.div>
);

// --- Main Page Component ---

const InpaintingPage: React.FC = () => {
  const [stage, setStage] = useState<ProcessingStage>('upload');
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [maskData, setMaskData] = useState<ImageData | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [brushSize, setBrushSize] = useState(40);
  const [selectedModel, setSelectedModel] = useState<ModelType>('auto');
  const [hasMask, setHasMask] = useState(false);
  
  // Processing state
  const [isProcessing, setIsProcessing] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<{ undo: () => void; redo: () => void; reset: () => void; }>(null);
  const workerRef = useRef<Worker | null>(null);

  // Initialize worker
  useEffect(() => {
    workerRef.current = new Worker(new URL('../workers/inpainting.worker.ts', import.meta.url), { type: 'module' });
    
    workerRef.current.onmessage = (event: MessageEvent) => {
      const { status, message, error: workerError, resultImageData, performanceStats, progress: workerProgress } = event.data;

      if (message) setStatusMessage(message);
      if (workerProgress !== undefined) setProgress(workerProgress);
      
      switch (status) {
        case 'initialized':
          console.log('Inpainting worker is ready.');
          break;
        case 'processing':
          setIsProcessing(true);
          setStage('processing');
          break;
        case 'complete':
          if (resultImageData && performanceStats) {
            // Convert ImageData to blob URL
            const canvas = document.createElement('canvas');
            canvas.width = resultImageData.width;
            canvas.height = resultImageData.height;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              const imageData = new ImageData(
                new Uint8ClampedArray(resultImageData.data),
                resultImageData.width,
                resultImageData.height
              );
              ctx.putImageData(imageData, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) {
                  const url = URL.createObjectURL(blob);
                  setResultImageUrl(url);
                  setStats(performanceStats);
                  setIsProcessing(false);
                  setStage('result');
                }
              });
            }
          }
          break;
        case 'error':
          setError(workerError || 'Processing failed');
          setIsProcessing(false);
          setStage('mask');
          break;
      }
    };

    // Initialize the worker
    workerRef.current.postMessage({ command: 'initialize' });

    return () => workerRef.current?.terminate();
  }, []);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setOriginalImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImageUrl(e.target?.result as string);
        setStage('mask');
        setError(null);
      };
      reader.readAsDataURL(file);
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
    setHasMask(false);
    setError(null);
    setProgress(0);
    setStatusMessage('');
  };

  const handleUndo = () => canvasRef.current?.undo();
  const handleRedo = () => canvasRef.current?.redo();
  const handleResetCanvas = () => canvasRef.current?.reset();

  const handleMaskChange = (newMaskData: ImageData) => {
    setMaskData(newMaskData);
    
    // Check if mask has any white pixels (painted areas)
    const data = newMaskData.data;
    let hasWhitePixels = false;
    for (let i = 0; i < data.length; i += 4) {
      if (data[i] > 128) { // Red channel > 128 means white-ish
        hasWhitePixels = true;
        break;
      }
    }
    setHasMask(hasWhitePixels);
  };

  const handleProcess = async () => {
    if (!originalImageFile || !maskData || !originalImageUrl) {
      setError('Please select an image and create a mask');
      return;
    }

    if (!hasMask) {
      setError('Please paint some areas to remove');
      return;
    }

    setError(null);
    setProgress(0);
    setStatusMessage('Preparing image...');

    // Convert image to ImageData
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        
        // Send to worker
        workerRef.current?.postMessage({
          command: 'process',
          imageData: {
            data: Array.from(imageData.data),
            width: imageData.width,
            height: imageData.height
          },
          maskData: {
            data: Array.from(maskData.data),
            width: maskData.width,
            height: maskData.height
          },
          modelType: selectedModel,
          quality: 'balanced'
        });
      }
    };
    img.src = originalImageUrl;
  };

  const renderContent = () => {
    switch (stage) {
      case 'upload':
        return (
          <div className="w-full max-w-4xl mx-auto">
            <div className="text-center mb-8">
              <h1 className="text-4xl md:text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                AI Object Removal
              </h1>
              <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                Remove unwanted objects from your images with advanced AI. Simply upload an image and paint over what you want to remove.
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
              <h2 className="text-3xl font-bold text-white mb-2">Create Your Mask</h2>
              <p className="text-gray-400">Paint over the objects you want to remove from your image</p>
            </div>
            
            <div className="flex flex-col lg:flex-row gap-6">
              {/* Left Panel: Controls */}
              <div className="lg:w-80 space-y-4">
                <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} />
                
                <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                  <h3 className="text-sm font-semibold text-gray-300 mb-3">Masking Tools</h3>
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="brush-size" className="text-xs font-medium text-gray-400 block mb-2">
                        Brush Size: {brushSize}px
                      </label>
                      <input
                        id="brush-size"
                        type="range"
                        min="10" max="100"
                        value={brushSize}
                        onChange={(e) => setBrushSize(Number(e.target.value))}
                        className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2">
                      <button 
                        onClick={handleUndo} 
                        className="flex items-center justify-center space-x-1 px-2 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-xs"
                        title="Undo"
                      >
                        <UndoIcon />
                      </button>
                      <button 
                        onClick={handleRedo} 
                        className="flex items-center justify-center space-x-1 px-2 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-xs"
                        title="Redo"
                      >
                        <RedoIcon />
                      </button>
                      <button 
                        onClick={handleResetCanvas} 
                        className="flex items-center justify-center space-x-1 px-2 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors text-xs"
                        title="Reset"
                      >
                        <ResetIcon />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <button
                    onClick={handleProcess}
                    disabled={!hasMask || isProcessing}
                    className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-lg shadow-lg"
                  >
                    {!hasMask ? 'Paint areas to remove' : 'Process Image'}
                  </button>
                  
                  <button
                    onClick={handleReset}
                    className="w-full py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition-colors font-medium"
                  >
                    Choose Different Image
                  </button>
                </div>
              </div>

              {/* Right Panel: Canvas */}
              <div className="flex-1 min-h-[500px]">
                <MaskingCanvas 
                  ref={canvasRef}
                  imageUrl={originalImageUrl} 
                  brushSize={brushSize}
                  onMaskChange={handleMaskChange}
                />
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

      {/* Processing Overlay */}
      <AnimatePresence>
        {stage === 'processing' && (
          <ProcessingOverlay 
            statusMessage={statusMessage} 
            progress={progress} 
          />
        )}
      </AnimatePresence>

      {/* Error Message */}
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
            <button 
              onClick={() => setError(null)}
              className="ml-2 text-red-300 hover:text-red-200"
            >
              ×
            </button>
          </div>
        </motion.div>
      )}

      <Footer />
    </div>
  );
};

export default InpaintingPage; 