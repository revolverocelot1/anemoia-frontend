import React, { useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface InpaintingOutputProps {
  originalImageFile: File;
  resultImageUrl: string;
  stats: {
    preprocessTime: number;
    inferenceTime: number;
    postprocessTime: number;
    totalTime: number;
    modelUsed: string;
    acceleration: string;
    gpuType: string;
  };
  onReset: () => void;
}

const InpaintingOutput: React.FC<InpaintingOutputProps> = ({
  originalImageFile,
  resultImageUrl,
  stats,
  onReset
}) => {
  const [originalImageUrl, setOriginalImageUrl] = useState<string>('');
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  
  React.useEffect(() => {
    if (originalImageFile) {
      const reader = new FileReader();
      reader.onload = () => {
        setOriginalImageUrl(reader.result as string);
      };
      reader.readAsDataURL(originalImageFile);
    }
  }, [originalImageFile]);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseDown = () => {
    setIsDragging(true);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const downloadImage = () => {
    const link = document.createElement('a');
    link.href = resultImageUrl;
    link.download = `inpainted-${originalImageFile.name}`;
    link.click();
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getAccelerationColor = (acceleration: string) => {
    if (acceleration.includes('WebGPU')) return 'text-green-400';
    if (acceleration.includes('WebGL')) return 'text-blue-400';
    if (acceleration.includes('WebAssembly')) return 'text-yellow-400';
    return 'text-orange-400';
  };

  return (
    <motion.div
      className="w-full bg-gray-950 text-white min-h-screen"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <motion.div 
          className="text-center mb-12"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-green-400 to-blue-400 bg-clip-text text-transparent">
            Object Removal Complete
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            Compare your original image with the AI-processed result. Drag the slider to see the difference.
          </p>
        </motion.div>

        {/* Image Comparison */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
        >
          <div className="bg-gray-800/30 rounded-2xl border border-gray-700 p-6">
            <h3 className="text-2xl font-bold text-center text-white mb-6">Before & After Comparison</h3>
            
            <div 
              ref={containerRef}
              className="relative w-full max-w-4xl mx-auto rounded-xl overflow-hidden shadow-2xl cursor-ew-resize"
              onMouseMove={handleMouseMove}
              onMouseDown={handleMouseDown}
              onMouseUp={handleMouseUp}
              onMouseLeave={handleMouseUp}
            >
              {/* Original Image (Background) */}
              {originalImageUrl && (
                <img
                  src={originalImageUrl}
                  alt="Original"
                  className="w-full h-auto block"
                  draggable={false}
                />
              )}
              
              {/* Result Image (Clipped) */}
              <div 
                className="absolute inset-0 overflow-hidden"
                style={{ clipPath: `inset(0 ${100 - sliderPosition}% 0 0)` }}
              >
                <img
                  src={resultImageUrl}
                  alt="Result"
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              </div>
              
              {/* Slider Line */}
              <div 
                className="absolute top-0 bottom-0 w-1 bg-white shadow-lg z-10"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <svg className="w-4 h-4 text-gray-800" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                  </svg>
                </div>
              </div>
              
              {/* Labels */}
              <div className="absolute bottom-4 left-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
                Original
              </div>
              <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
                AI Processed
              </div>
            </div>
            
            <p className="text-center text-gray-400 mt-4 text-sm">
              Drag the slider to compare • Click and drag anywhere on the image
            </p>
          </div>
        </motion.div>

        {/* Statistics */}
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, staggerChildren: 0.1 }}
        >
          <motion.div 
            className="bg-gray-800/30 rounded-xl p-4 border border-gray-700"
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <h4 className="text-sm font-medium text-gray-400 mb-1">Total Time</h4>
            <p className="text-2xl font-bold text-white">{formatTime(stats.totalTime)}</p>
          </motion.div>
          
          <motion.div 
            className="bg-gray-800/30 rounded-xl p-4 border border-gray-700"
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <h4 className="text-sm font-medium text-gray-400 mb-1">Model Used</h4>
            <p className="text-lg font-semibold text-white">{stats.modelUsed}</p>
          </motion.div>
          
          <motion.div 
            className="bg-gray-800/30 rounded-xl p-4 border border-gray-700"
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <h4 className="text-sm font-medium text-gray-400 mb-1">Acceleration</h4>
            <p className={`text-lg font-semibold ${getAccelerationColor(stats.acceleration)}`}>
              {stats.acceleration}
            </p>
          </motion.div>
          
          <motion.div 
            className="bg-gray-800/30 rounded-xl p-4 border border-gray-700"
            whileHover={{ scale: 1.02, y: -2 }}
          >
            <h4 className="text-sm font-medium text-gray-400 mb-1">GPU Type</h4>
            <p className="text-lg font-semibold text-white">{stats.gpuType}</p>
          </motion.div>
        </motion.div>

        {/* Detailed Performance */}
        <motion.div
          className="bg-gray-800/30 rounded-xl p-6 border border-gray-700 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <h3 className="text-xl font-bold text-white mb-4 flex items-center">
            <svg className="w-5 h-5 mr-2 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2H9a2 2 0 01-2-2z" />
            </svg>
            Performance Breakdown
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Preprocessing:</span>
                <span className="text-white font-medium">{formatTime(stats.preprocessTime)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-400 h-2 rounded-full transition-all duration-1000" 
                  style={{ width: `${(stats.preprocessTime / stats.totalTime) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">AI Inference:</span>
                <span className="text-white font-medium">{formatTime(stats.inferenceTime)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-green-400 h-2 rounded-full transition-all duration-1000" 
                  style={{ width: `${(stats.inferenceTime / stats.totalTime) * 100}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Postprocessing:</span>
                <span className="text-white font-medium">{formatTime(stats.postprocessTime)}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-purple-400 h-2 rounded-full transition-all duration-1000" 
                  style={{ width: `${(stats.postprocessTime / stats.totalTime) * 100}%` }}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
        >
          <motion.button
            onClick={downloadImage}
            className="flex items-center justify-center space-x-2 px-8 py-4 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-500 hover:to-blue-500 text-white font-semibold rounded-xl shadow-xl hover:shadow-2xl transition-all duration-300"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download Result</span>
          </motion.button>
          
          <motion.button
            onClick={onReset}
            className="flex items-center justify-center space-x-2 px-8 py-4 bg-gray-700 hover:bg-gray-600 text-white font-semibold rounded-xl border border-gray-600 hover:border-gray-500 transition-all duration-300"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>Process Another Image</span>
          </motion.button>
        </motion.div>

        {/* File Info */}
        <motion.div
          className="mt-8 text-center text-sm text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
        >
          <p>Original file: {originalImageFile.name} ({formatFileSize(originalImageFile.size)})</p>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default InpaintingOutput; 