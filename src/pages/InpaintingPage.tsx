import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDropzone } from 'react-dropzone';
import Header from '../components/Header';
import Footer from '../components/Footer';
import InpaintingOutput from '../components/inpainting/InpaintingOutput';
import MaskingCanvas from '../components/inpainting/MaskingCanvas';
// Keep ProcessingOverlay commented out until needed
// import ProcessingOverlay from '../components/inpainting/ProcessingOverlay';

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
type ModelType = 'AOT-GAN' | 'MI-GAN' | 'SD-1.5';

interface ModelSelectorProps {
  selectedModel: ModelType;
  onSelect: (model: ModelType) => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModel, onSelect }) => (
    <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">AI Model</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {['AOT-GAN', 'MI-GAN', 'SD-1.5'].map(model => (
                <button
                    key={model}
                    onClick={() => onSelect(model as ModelType)}
                    className={`px-3 py-2 text-sm font-semibold rounded-lg transition-all duration-200 border-2 ${
                        selectedModel === model
                            ? 'bg-blue-600 border-blue-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                            : 'bg-gray-700/50 border-gray-600 text-gray-300 hover:bg-gray-600 hover:border-gray-500'
                    }`}
                >
                    {model}
                </button>
            ))}
        </div>
        <p className="text-xs text-gray-500 mt-3">
            {selectedModel === 'AOT-GAN' && 'Best for removing specific objects cleanly.'}
            {selectedModel === 'MI-GAN' && 'Fast and effective for general purpose inpainting.'}
            {selectedModel === 'SD-1.5' && 'Creative mode: Generates new content for the masked area.'}
        </p>
    </div>
);

// --- Main Page Component ---

const InpaintingPage: React.FC = () => {
  const [stage, setStage] = useState<'upload' | 'mask' | 'result'>('upload');
  const [originalImageFile, setOriginalImageFile] = useState<File | null>(null);
  const [originalImageUrl, setOriginalImageUrl] = useState<string | null>(null);
  const [maskData, setMaskData] = useState<ImageData | null>(null);
  const [resultImageUrl, setResultImageUrl] = useState<string>('');
  const [stats, setStats] = useState<any>(null);
  const [brushSize, setBrushSize] = useState(40);
  const [selectedModel, setSelectedModel] = useState<ModelType>('AOT-GAN');
  const canvasRef = useRef<{ undo: () => void; redo: () => void; reset: () => void; }>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      setOriginalImageFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setOriginalImageUrl(e.target?.result as string);
        setStage('mask');
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.jpeg', '.png', '.jpg'] },
    multiple: false,
  });
  
  const handleReset = () => {
    setStage('upload');
    setOriginalImageFile(null);
    setOriginalImageUrl(null);
    setResultImageUrl('');
    setStats(null);
    setMaskData(null);
  }

  const handleUndo = () => canvasRef.current?.undo();
  const handleRedo = () => canvasRef.current?.redo();
  const handleResetCanvas = () => canvasRef.current?.reset();

  const renderContent = () => {
    switch (stage) {
      case 'upload':
        return (
          <div {...getRootProps()} className={`w-full h-full flex items-center justify-center border-4 border-dashed rounded-2xl cursor-pointer transition-colors ${isDragActive ? 'border-blue-500 bg-blue-500/10' : 'border-gray-600 hover:border-gray-500'}`}>
            <input {...getInputProps()} />
            <div className="text-center">
              <UploadIcon />
              <p className="mt-4 text-xl font-semibold text-gray-300">
                {isDragActive ? 'Drop the image here...' : 'Drag & drop an image, or click to select'}
              </p>
              <p className="text-sm text-gray-500">PNG, JPG up to 10MB</p>
            </div>
          </div>
        );
      case 'mask':
        if (!originalImageUrl) return null;
        return (
          <div className="flex flex-col lg:flex-row w-full h-full gap-6">
            {/* Left Panel: Controls */}
            <div className="flex-shrink-0 w-full lg:w-64 flex flex-col space-y-4">
              <ModelSelector selectedModel={selectedModel} onSelect={setSelectedModel} />
              
              <div className="bg-gray-800/50 p-4 rounded-xl border border-gray-700">
                <h3 className="text-sm font-semibold text-gray-300 mb-3">Masking Tools</h3>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="brush-size" className="text-xs font-medium text-gray-400">Brush Size: {brushSize}</label>
                    <input
                      id="brush-size"
                      type="range"
                      min="5" max="100"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={handleUndo} className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"><UndoIcon /><span>Undo</span></button>
                    <button onClick={handleRedo} className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"><RedoIcon /><span>Redo</span></button>
                    <button onClick={handleResetCanvas} className="flex items-center justify-center space-x-2 px-3 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors"><ResetIcon /><span>Reset</span></button>
                  </div>
                </div>
              </div>

              <button
                disabled={!maskData}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold text-lg shadow-lg"
              >
                Process Image
              </button>
            </div>

            {/* Right Panel: Canvas */}
            <div className="flex-1 relative min-h-[400px] lg:min-h-0">
              <MaskingCanvas 
                ref={canvasRef}
                imageUrl={originalImageUrl} 
                brushSize={brushSize}
                onMaskChange={setMaskData}
              />
            </div>
          </div>
        );
      case 'result':
        if (!originalImageFile) return null; // Guard clause
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
  }

  return (
    <div className="relative flex min-h-screen flex-col bg-gray-950 text-white">
      <Header />
      
      <main className="flex-1 flex flex-col items-center py-8 px-4">
        <div className="bg-gray-800 rounded-2xl shadow-2xl p-6 min-h-[60vh] flex flex-col">
          <AnimatePresence mode="wait">
            <motion.div
              key={stage}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.5 }}
              className="w-full h-full"
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default InpaintingPage; 