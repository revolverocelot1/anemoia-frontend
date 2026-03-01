import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';

interface ModelCardProps {
  title: string;
  description: string;
  scale: number;
  selected: boolean;
  onSelect: () => void;
  modelType: string;
  size: string;
  speed: 'Fast' | 'Medium' | 'Slow';
  quality: 'Good' | 'Better' | 'Best';
}

const ModelCard: React.FC<ModelCardProps> = ({ 
  title, 
  description, 
  scale, 
  selected, 
  onSelect, 
  modelType,
  size,
  speed,
  quality
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
        <div className="text-xs font-bold bg-blue-500/20 text-blue-300 border border-blue-400/50 rounded-full px-3 py-1">
          {scale}x
            </div>
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

interface UpscalerInputProps {
  onImageUploaded: (file: File, scaleFactor: number, modelType: string) => void;
  isProcessing: boolean;
}

const UpscalerInput: React.FC<UpscalerInputProps> = ({ onImageUploaded, isProcessing }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedScale, setSelectedScale] = useState<number>(2);
  const [selectedModelType, setSelectedModelType] = useState<string>('cugan');
  const [error, setError] = useState<string | null>(null);

  const models = [
    {
      scale: 2,
      title: 'Real-CUGAN 2x',
      description: 'Ultra-fast AI upscaling with excellent quality. Best for most use cases.',
      modelType: 'Real-CUGAN',
      size: '2.6MB',
      speed: 'Fast' as const,
      quality: 'Better' as const,
      type: 'cugan'
    },
    {
      scale: 4,
      title: 'Real-CUGAN 4x',
      description: 'Fast 4x upscaling with noise reduction. Great balance of speed and quality.',
      modelType: 'Real-CUGAN',
      size: '2.9MB',
      speed: 'Fast' as const,
      quality: 'Better' as const,
      type: 'cugan'
    },
    {
      scale: 4,
      title: 'Real-ESRGAN 4x (Anime)',
      description: 'Specialized for anime and illustrations. Superior detail preservation.',
      modelType: 'Real-ESRGAN',
      size: '9.2MB',
      speed: 'Medium' as const,
      quality: 'Best' as const,
      type: 'esrgan-anime'
    },
    {
      scale: 4,
      title: 'Real-ESRGAN 4x (General)',
      description: 'Best overall quality for photos and general images. Maximum detail recovery.',
      modelType: 'Real-ESRGAN',
      size: '34.2MB',
      speed: 'Slow' as const,
      quality: 'Best' as const,
      type: 'esrgan-general'
    },
    {
      scale: 8,
      title: 'Real-ESRGAN 8x (Experimental)',
      description: 'Extreme 8x upscaling for maximum detail. Requires powerful device.',
      modelType: 'Real-ESRGAN',
      size: '34.2MB',
      speed: 'Slow' as const,
      quality: 'Best' as const,
      type: 'esrgan-8x'
    }
  ];

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: any[]) => {
    setError(null);
    if (rejectedFiles && rejectedFiles.length > 0) {
      setError('Please upload a valid image file (PNG, JPG, WebP).');
      return;
    }

    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB.');
        return;
      }
      
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.bmp'] },
    multiple: false,
  });

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

  const handleModelSelect = (scale: number, type: string) => {
    setSelectedScale(scale);
    setSelectedModelType(type);
  };

  const handleUpscaleClick = () => {
    if (selectedFile) {
      onImageUploaded(selectedFile, selectedScale, selectedModelType);
    } else {
      setError('Please select an image first.');
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
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            AI Image Upscaler
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            Transform your images with cutting-edge AI. Choose from Real-CUGAN for speed or Real-ESRGAN for maximum quality.
        </p>
      </motion.div>

        {/* Upload Area */}
      <motion.div
        {...rootProps}
        ref={ref}
        variants={itemVariants}
          className={`relative group mb-8 p-8 border-2 border-dashed rounded-2xl transition-all duration-300 cursor-pointer ${
            isDragActive 
              ? 'border-blue-400 bg-blue-400/5 scale-[1.02]' 
              : 'border-gray-600 hover:border-blue-400 hover:bg-gray-800/50'
          } ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
          <input {...getInputProps()} disabled={isProcessing} />
          
        {previewUrl ? (
            <div className="text-center">
              <div className="relative inline-block">
                <img 
                  src={previewUrl} 
                  alt="Preview" 
                  className="max-h-64 rounded-xl shadow-lg"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent rounded-xl" />
                <div className="absolute bottom-4 left-4 text-white">
                  <p className="text-sm font-medium">{selectedFile?.name}</p>
                  <p className="text-xs text-gray-300">
                    {selectedFile && (selectedFile.size / 1024 / 1024).toFixed(1)}MB
                  </p>
                </div>
              </div>
              <motion.button
                onClick={(e) => {
                  e.stopPropagation();
                  setPreviewUrl(null);
                  setSelectedFile(null);
                }}
                className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors"
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                Remove Image
              </motion.button>
            </div>
          ) : (
            <div className="text-center">
              <motion.div
                className="mx-auto w-16 h-16 rounded-full bg-gradient-to-r from-blue-500/20 to-purple-500/20 flex items-center justify-center mb-4"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
              >
                <svg className="w-8 h-8 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </motion.div>
              <p className="text-lg font-semibold text-white mb-2">
                {isDragActive ? 'Drop your image here!' : 'Drag & drop an image here'}
              </p>
              <p className="text-gray-400 mb-1">or click to select a file</p>
              <p className="text-xs text-gray-500">Supports: PNG, JPG, WebP, BMP (max 10MB)</p>
          </div>
        )}
      </motion.div>

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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {models.map((model) => (
          <ModelCard
                key={`${model.scale}-${model.type}`}
                title={model.title}
                description={model.description}
                scale={model.scale}
                selected={selectedScale === model.scale && selectedModelType === model.type}
                onSelect={() => handleModelSelect(model.scale, model.type)}
                modelType={model.modelType}
                size={model.size}
                speed={model.speed}
                quality={model.quality}
              />
            ))}
          </div>
        </motion.div>

        {/* Performance Info */}
        <motion.div variants={itemVariants} className="mb-8 p-6 bg-gray-800/30 rounded-xl border border-gray-700">
          <h4 className="text-lg font-semibold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Performance Tips
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-400">
            <div>
              <p className="mb-2"><strong className="text-green-400">Real-CUGAN:</strong> 5-10x faster than Real-ESRGAN</p>
              <p className="mb-2"><strong className="text-blue-400">WebGPU:</strong> Enable in Chrome for 2x speed boost</p>
            </div>
            <div>
              <p className="mb-2"><strong className="text-purple-400">Large images:</strong> May take longer to process</p>
              <p className="mb-2"><strong className="text-orange-400">8x upscaling:</strong> Requires powerful device</p>
            </div>
        </div>
      </motion.div>

        {/* Upscale Button */}
      <motion.div variants={itemVariants}>
          <motion.button
          onClick={handleUpscaleClick}
          disabled={isProcessing || !selectedFile}
            className="w-full flex items-center justify-center space-x-3 px-8 py-4 rounded-xl text-lg font-semibold text-white bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:from-blue-600 disabled:hover:to-purple-600 shadow-xl hover:shadow-2xl"
            whileHover={{ scale: isProcessing || !selectedFile ? 1 : 1.02, y: isProcessing || !selectedFile ? 0 : -2 }}
            whileTap={{ scale: isProcessing || !selectedFile ? 1 : 0.98 }}
        >
            {isProcessing ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span>Processing...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                <span>Start AI Upscaling</span>
              </>
            )}
          </motion.button>
      </motion.div>
      </div>
    </motion.div>
  );
};

export default UpscalerInput; 