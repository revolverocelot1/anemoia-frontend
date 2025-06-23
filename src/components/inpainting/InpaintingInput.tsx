import React, { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';

interface ModelCardProps {
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
  modelType: string;
  size: string;
  speed: 'Fast' | 'Medium' | 'Slow';
  quality: 'Good' | 'Better' | 'Best';
  gpuType: string;
  recommended?: boolean;
}

const ModelCard: React.FC<ModelCardProps> = ({ 
  title, 
  description, 
  selected, 
  onSelect, 
  modelType,
  size,
  speed,
  quality,
  gpuType,
  recommended
}) => {
  const speedColor = speed === 'Fast' ? 'text-green-400' : speed === 'Medium' ? 'text-yellow-400' : 'text-orange-400';
  const qualityColor = quality === 'Good' ? 'text-blue-400' : quality === 'Better' ? 'text-purple-400' : 'text-pink-400';
  
  return (
    <motion.div
      className={`relative overflow-hidden rounded-xl border-2 cursor-pointer transition-all duration-300 ${
        selected 
          ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/25' 
          : 'border-gray-700 bg-gray-800/50 hover:border-blue-400 hover:bg-gray-800/70'
      }`}
      onClick={onSelect}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-lg font-bold text-white">{title}</h4>
          <div className="flex items-center space-x-2">
            {recommended && (
              <div className="text-xs font-bold bg-green-500/20 text-green-300 border border-green-400/50 rounded-full px-3 py-1">
                Recommended
              </div>
            )}
            {selected && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center"
              >
                <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </motion.div>
            )}
          </div>
        </div>
        
        <p className="text-sm text-gray-400 mb-4 leading-relaxed">{description}</p>
        
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded-md">
            {modelType}
          </span>
          <span className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded-md">
            {size}
          </span>
          <span className={`bg-gray-700/50 px-2 py-1 rounded-md ${speedColor}`}>
            {speed}
          </span>
          <span className={`bg-gray-700/50 px-2 py-1 rounded-md ${qualityColor}`}>
            {quality}
          </span>
          <span className="bg-gray-700/50 text-gray-300 px-2 py-1 rounded-md">
            {gpuType}
          </span>
        </div>
      </div>
      
      {selected && (
        <motion.div
          className="absolute inset-0 border-2 border-blue-400 rounded-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.2 }}
        />
      )}
    </motion.div>
  );
};

interface InpaintingInputProps {
  onImageUploaded: (file: File, maskData: ImageData, modelType: string) => void;
  isProcessing: boolean;
}

const InpaintingInput: React.FC<InpaintingInputProps> = ({ onImageUploaded, isProcessing }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedModelType, setSelectedModelType] = useState<string>('auto');
  const [error, setError] = useState<string | null>(null);
  const [brushMode, setBrushMode] = useState<'paint' | 'erase'>('paint');
  const [brushSize, setBrushSize] = useState(25);
  const [isDrawing, setIsDrawing] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);

  const models = [
    {
      title: 'Auto Select',
      description: 'Automatically chooses the best model for your GPU. Recommended for most users.',
      modelType: 'Auto Selection',
      size: 'Variable',
      speed: 'Medium' as const,
      quality: 'Better' as const,
      type: 'auto',
      gpuType: 'Any GPU',
      recommended: true
    },
    {
      title: 'MI-GAN Mobile',
      description: 'Fast object removal optimized for integrated graphics and mobile devices.',
      modelType: 'MI-GAN',
      size: '2.1MB',
      speed: 'Fast' as const,
      quality: 'Good' as const,
      type: 'mi-gan-mobile',
      gpuType: 'Integrated GPU'
    },
    {
      title: 'LaMa High Quality',
      description: 'Best quality object removal using Fourier convolutions. Requires dedicated GPU.',
      modelType: 'LaMa',
      size: '8.5MB',
      speed: 'Slow' as const,
      quality: 'Best' as const,
      type: 'lama-big',
      gpuType: 'Dedicated GPU'
    }
  ];

  const setupCanvases = (imageSrc: string) => {
    const img = new Image();
    img.onload = () => {
      if (canvasRef.current && maskCanvasRef.current) {
        const canvas = canvasRef.current;
        const maskCanvas = maskCanvasRef.current;
        
        // Set canvas size
        const maxSize = 512;
        const scale = Math.min(maxSize / img.width, maxSize / img.height);
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        maskCanvas.width = canvas.width;
        maskCanvas.height = canvas.height;
        
        // Draw image
        const ctx = canvas.getContext('2d');
        const maskCtx = maskCanvas.getContext('2d');
        
        if (ctx && maskCtx) {
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          
          // Clear mask
          maskCtx.fillStyle = 'black';
          maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
        }
      }
    };
    img.src = imageSrc;
  };

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    if (rejectedFiles && rejectedFiles.length > 0) {
      setError('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Check file size (max 20MB for inpainting)
      if (file.size > 20 * 1024 * 1024) {
        setError('File size must be less than 20MB.');
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
        setupCanvases(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const dropzone = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp'] },
    multiple: false,
  });

  const { getRootProps, getInputProps, isDragActive } = dropzone;

  const {
    ref,
    onAnimationStart,
    onAnimationEnd,
    onAnimationIteration,
    onTransitionEnd,
    onDrag,
    onDragStart,
    onDragEnd,
    ...rootProps
  } = getRootProps();

  const handleModelSelect = (type: string) => {
    setSelectedModelType(type);
  };

  const handleStartInpainting = () => {
    if (selectedFile && maskCanvasRef.current) {
      const maskCtx = maskCanvasRef.current.getContext('2d');
      if (maskCtx) {
        const maskData = maskCtx.getImageData(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
        onImageUploaded(selectedFile, maskData, selectedModelType);
      }
    } else {
      setError('Please select an image and paint the areas to remove.');
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    draw(e);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !maskCanvasRef.current) return;
    
    const rect = maskCanvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const ctx = maskCanvasRef.current.getContext('2d');
    if (ctx) {
      ctx.globalCompositeOperation = brushMode === 'paint' ? 'source-over' : 'destination-out';
      ctx.fillStyle = 'rgba(255, 0, 0, 0.7)';
      ctx.beginPath();
      ctx.arc(x, y, brushSize / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearMask = () => {
    if (maskCanvasRef.current) {
      const ctx = maskCanvasRef.current.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'black';
        ctx.fillRect(0, 0, maskCanvasRef.current.width, maskCanvasRef.current.height);
      }
    }
  };
  
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <motion.div 
      className="w-full bg-gray-950 text-white min-h-screen"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-6xl mx-auto px-4 py-12">
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-red-400 to-pink-400 bg-clip-text text-transparent">
            AI Object Removal
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            Remove unwanted objects from your images with advanced AI models. Paint over objects to remove them seamlessly.
          </p>
        </motion.div>

        {/* Upload and Editing Area */}
        {!previewUrl ? (
          <motion.div
            ref={ref}
            {...rootProps}
            variants={itemVariants}
            className={`relative group mb-8 p-8 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer ${
              isDragActive 
                ? 'border-red-400 bg-red-400/5 scale-[1.02]' 
                : 'border-gray-600 hover:border-red-400 hover:bg-gray-800/50'
            } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <input {...getInputProps()} disabled={isProcessing} />
            
            <div className="text-center">
              <motion.div
                className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-red-500/20 to-pink-500/20 flex items-center justify-center mb-4"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </motion.div>
              <p className="text-lg font-semibold text-white mb-2">
                {isDragActive ? 'Drop your image here!' : 'Drag & drop an image here'}
              </p>
              <p className="text-gray-400 mb-1">or click to select a file</p>
              <p className="text-xs text-gray-500">Supports: PNG, JPG, WebP, BMP (max 20MB)</p>
            </div>
          </motion.div>
        ) : (
          <motion.div variants={itemVariants} className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6 bg-gray-800/30 rounded-2xl border border-gray-700">
              {/* Original Image */}
              <div className="text-center">
                <h4 className="text-lg font-semibold mb-4 text-white">Original Image</h4>
                <div className="relative inline-block">
                  <canvas 
                    ref={canvasRef}
                    className="max-w-full max-h-64 rounded-xl shadow-lg border border-gray-600"
                  />
                </div>
              </div>
              
              {/* Mask Editor */}
              <div className="text-center">
                <h4 className="text-lg font-semibold mb-4 text-white">Paint Objects to Remove</h4>
                <div className="relative inline-block">
                  <canvas 
                    ref={maskCanvasRef}
                    className="max-w-full max-h-64 rounded-xl shadow-lg border border-gray-600 cursor-crosshair"
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    style={{ touchAction: 'none' }}
                  />
                </div>
              </div>
              
              {/* Brush Controls */}
              <div className="lg:col-span-2">
                <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setBrushMode('paint')}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        brushMode === 'paint' 
                          ? 'bg-red-500 text-white shadow-lg' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                      </svg>
                      Paint
                    </button>
                    <button
                      onClick={() => setBrushMode('erase')}
                      className={`px-4 py-2 rounded-lg transition-colors ${
                        brushMode === 'erase' 
                          ? 'bg-blue-500 text-white shadow-lg' 
                          : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      }`}
                    >
                      <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2M3 12l6.414 6.414a2 2 0 001.414.586H19a2 2 0 002-2V7a2 2 0 00-2-2h-8.172a2 2 0 00-1.414.586L3 12z" />
                      </svg>
                      Erase
                    </button>
                    <button
                      onClick={clearMask}
                      className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Clear
                    </button>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-400">Brush Size:</span>
                    <input
                      type="range"
                      min="5"
                      max="50"
                      value={brushSize}
                      onChange={(e) => setBrushSize(Number(e.target.value))}
                      className="w-32 h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer"
                    />
                    <span className="text-sm text-gray-400 min-w-[40px]">{brushSize}px</span>
                  </div>
                </div>
                
                <div className="text-center">
                  <motion.button
                    onClick={(e) => {
                      e.stopPropagation();
                      setPreviewUrl(null);
                      setSelectedFile(null);
                    }}
                    className="px-4 py-2 bg-gray-700 text-gray-300 border border-gray-600 rounded-lg hover:bg-gray-600 transition-colors"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    Choose Different Image
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div 
            variants={itemVariants} 
            className="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-center"
          >
            {error}
          </motion.div>
        )}

        {/* Model Selection */}
        <motion.div variants={itemVariants} className="mb-8">
          <h3 className="text-2xl font-bold mb-6 text-center text-white">
            Choose Your AI Model
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {models.map((model) => (
              <ModelCard
                key={model.type}
                title={model.title}
                description={model.description}
                selected={selectedModelType === model.type}
                onSelect={() => handleModelSelect(model.type)}
                modelType={model.modelType}
                size={model.size}
                speed={model.speed}
                quality={model.quality}
                gpuType={model.gpuType}
                recommended={model.recommended}
              />
            ))}
          </div>
        </motion.div>

        {/* Performance Info */}
        <motion.div variants={itemVariants} className="mb-8 p-6 bg-gray-800/30 rounded-xl border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Performance Tips
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
            <div>
              <p className="mb-2"><strong className="text-green-400">MI-GAN:</strong> Fast processing for integrated GPUs</p>
              <p className="mb-2"><strong className="text-blue-400">WebGPU:</strong> Enable in Chrome for GPU acceleration</p>
            </div>
            <div>
              <p className="mb-2"><strong className="text-purple-400">LaMa:</strong> Best quality for dedicated GPUs</p>
              <p className="mb-2"><strong className="text-orange-400">Auto Select:</strong> Chooses optimal model automatically</p>
            </div>
          </div>
        </motion.div>

        {/* Start Inpainting Button */}
        <motion.div variants={itemVariants}>
          <motion.button
            onClick={handleStartInpainting}
            disabled={isProcessing || !selectedFile}
            className="w-full flex items-center justify-center space-x-3 px-8 py-4 rounded-xl text-lg font-semibold text-white bg-gradient-to-r from-red-600 to-pink-600 hover:from-red-500 hover:to-pink-500 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-red-600 disabled:hover:to-pink-600 shadow-xl hover:shadow-2xl"
            whileHover={{ scale: isProcessing || !selectedFile ? 1 : 1.02, y: isProcessing || !selectedFile ? 0 : -2 }}
            whileTap={{ scale: isProcessing || !selectedFile ? 1 : 0.98 }}
          >
            {isProcessing ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Removing Objects...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
                <span>Start Object Removal</span>
              </>
            )}
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default InpaintingInput; 