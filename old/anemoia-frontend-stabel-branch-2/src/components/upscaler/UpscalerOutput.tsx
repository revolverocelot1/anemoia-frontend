import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface UpscalerStats {
  originalWidth: number;
  originalHeight: number;
  upscaledWidth: number;
  upscaledHeight: number;
  processingTime: number;
  scaleFactor: number;
  modelName: string;
  backend: string;
  fileSize?: string;
  originalFileSize?: string;
}

interface UpscalerOutputProps {
  originalImageFile: File;
  upscaledImageUrl: string;
  stats: UpscalerStats;
  onReset: () => void;
}

const StatCard: React.FC<{ 
  icon: React.ReactNode; 
  label: string; 
  value: string; 
  improvement?: string;
  color?: string;
}> = ({ icon, label, value, improvement, color = "blue" }) => (
  <motion.div 
    className="bg-gray-800/30 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-gray-600/50 transition-all duration-300"
    whileHover={{ scale: 1.02, y: -2 }}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
  >
    <div className="flex items-center space-x-3 mb-3">
      <div className={`w-10 h-10 rounded-lg bg-${color}-500/10 flex items-center justify-center text-${color}-400`}>
      {icon}
      </div>
    <div>
        <h4 className="text-sm font-medium text-gray-400">{label}</h4>
      </div>
    </div>
    <p className="text-xl font-semibold text-white mb-1">{value}</p>
    {improvement && (
      <p className="text-sm text-green-400 flex items-center">
        <svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        </svg>
        {improvement}
      </p>
    )}
  </motion.div>
);

const UpscalerOutput: React.FC<UpscalerOutputProps> = ({ originalImageFile, upscaledImageUrl, stats, onReset }) => {
  const [originalUrl, setOriginalUrl] = useState('');
  const [showComparison, setShowComparison] = useState(true);
  const [sliderPosition, setSliderPosition] = useState(50);

  useEffect(() => {
    const url = URL.createObjectURL(originalImageFile);
    setOriginalUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [originalImageFile]);

  const handleDownload = async () => {
    try {
      const response = await fetch(upscaledImageUrl);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `upscaled_${stats.scaleFactor}x_${originalImageFile.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
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
    <div className="min-h-screen bg-gray-950 text-white">
    <motion.div 
        className="max-w-6xl mx-auto px-4 py-12"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 tracking-tight bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Upscaling Complete!
          </h2>
          <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto">
            Your image has been enhanced using AI. Compare the results and download your high-resolution image.
          </p>
        </motion.div>

        {/* Image Comparison */}
        <motion.div variants={itemVariants} className="mb-12">
          <div className="bg-gray-800/20 backdrop-blur-sm rounded-2xl p-8 border border-gray-700/30">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-white">Image Comparison</h3>
              <div className="flex items-center space-x-4">
                <motion.button
                  onClick={() => setShowComparison(!showComparison)}
                  className="px-4 py-2 bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg hover:bg-blue-500/30 transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {showComparison ? 'Split View' : 'Side by Side'}
                </motion.button>
              </div>
      </div>

            {showComparison ? (
              <div className="relative overflow-hidden rounded-xl">
                <div className="relative">
                  <img 
                    src={upscaledImageUrl} 
                    alt="Upscaled" 
                    className="w-full h-auto"
                  />
                  <div 
                    className="absolute top-0 left-0 h-full overflow-hidden"
                    style={{ width: `${sliderPosition}%` }}
                  >
                    <img 
                      src={originalUrl} 
                      alt="Original" 
                      className="w-full h-auto object-cover"
                      style={{ width: `${(100 / sliderPosition) * 100}%` }}
                    />
          </div>
                  
                  {/* Slider Handle */}
                  <div 
                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg cursor-ew-resize z-10"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-lg flex items-center justify-center">
                      <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                      </svg>
          </div>
        </div>
      </div>

                {/* Slider Input */}
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={sliderPosition}
                  onChange={(e) => setSliderPosition(parseInt(e.target.value))}
                  className="absolute top-0 left-0 w-full h-full opacity-0 cursor-ew-resize z-20"
                />
                
                {/* Labels */}
                <div className="absolute bottom-4 left-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-white text-sm font-medium">Original</span>
                </div>
                <div className="absolute bottom-4 right-4 bg-black/50 backdrop-blur-sm rounded-lg px-3 py-1">
                  <span className="text-white text-sm font-medium">Upscaled {stats.scaleFactor}x</span>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-gray-300">Original Image</h4>
                  <div className="rounded-xl overflow-hidden">
                    <img src={originalUrl} alt="Original" className="w-full h-auto" />
                  </div>
                </div>
                <div className="space-y-3">
                  <h4 className="text-lg font-semibold text-gray-300">Upscaled Image ({stats.scaleFactor}x)</h4>
                  <div className="rounded-xl overflow-hidden">
                    <img src={upscaledImageUrl} alt="Upscaled" className="w-full h-auto" />
                  </div>
        </div>
      </div>
            )}
          </div>
        </motion.div>

        {/* Statistics */}
        <motion.div variants={itemVariants} className="mb-12">
          <h3 className="text-2xl font-bold text-white mb-6 text-center">Processing Statistics</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.79 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.79 4 8 4s8-1.79 8-4M4 7c0-2.21 3.79-4 8-4s8 1.79 8 4" />
                </svg>
              }
              label="Resolution"
              value={`${stats.originalWidth} × ${stats.originalHeight}`}
              improvement={`→ ${stats.upscaledWidth} × ${stats.upscaledHeight}`}
              color="blue"
            />
            
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              label="File Size"
              value={stats.originalFileSize || 'N/A'}
              improvement={stats.fileSize ? `→ ${stats.fileSize}` : undefined}
              color="green"
            />
            
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              }
              label="Scale Factor"
              value={`${stats.scaleFactor}x`}
              improvement={`${((stats.scaleFactor ** 2) * 100 - 100).toFixed(0)}% more pixels`}
              color="purple"
            />
            
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              }
              label="AI Model"
              value={stats.modelName}
              color="orange"
            />
            
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              label="Processing Time"
              value={`${stats.processingTime.toFixed(2)}s`}
              color="pink"
            />
            
            <StatCard
              icon={
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                </svg>
              }
              label="Backend"
              value={stats.backend.toUpperCase()}
              color="indigo"
            />
      </div>
    </motion.div>

        {/* Action Buttons */}
        <motion.div variants={itemVariants} className="flex flex-col md:flex-row gap-4">
          <motion.button
            onClick={handleDownload}
            className="flex-1 flex items-center justify-center space-x-3 px-8 py-4 rounded-xl text-lg font-semibold text-white bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 shadow-xl hover:shadow-2xl"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>Download Upscaled Image</span>
          </motion.button>
          
          <motion.button
            onClick={onReset}
            className="flex-1 flex items-center justify-center space-x-3 px-8 py-4 rounded-xl text-lg font-semibold text-white bg-gray-700 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-gray-900 transition-all duration-300 shadow-xl hover:shadow-2xl"
            whileHover={{ scale: 1.02, y: -2 }}
            whileTap={{ scale: 0.98 }}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            <span>Upscale Another Image</span>
          </motion.button>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default UpscalerOutput; 