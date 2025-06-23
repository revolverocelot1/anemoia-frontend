import React from 'react';
import { motion } from 'framer-motion';

interface ProcessingOverlayProps {
  statusMessage: string;
  progress: number;
  gpuInfo?: {
    type: string;
    performance: string;
    acceleration: string;
  };
  modelInfo?: {
    name: string;
    loadingProgress: number;
  };
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({
  statusMessage,
  progress,
  gpuInfo,
  modelInfo
}) => {
  const getGPUIcon = (type: string) => {
    if (type.includes('nvidia')) {
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.5 3c.5 0 1 .2 1.4.6.4.4.6.9.6 1.4v14c0 .5-.2 1-.6 1.4-.4.4-.9.6-1.4.6s-1-.2-1.4-.6c-.4-.4-.6-.9-.6-1.4V5c0-.5.2-1 .6-1.4.4-.4.9-.6 1.4-.6z"/>
        </svg>
      );
    } else if (type.includes('amd')) {
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>
      );
    } else if (type.includes('intel')) {
      return (
        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M3 3v18h18V3H3zm16 16H5V5h14v14z"/>
        </svg>
      );
    }
    return (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
      </svg>
    );
  };

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'high': return 'text-green-400';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-orange-400';
      default: return 'text-gray-400';
    }
  };

  const getAccelerationColor = (acceleration: string) => {
    if (acceleration?.includes('WebGPU')) return 'text-green-400';
    if (acceleration?.includes('WebGL')) return 'text-blue-400';
    if (acceleration?.includes('WebAssembly')) return 'text-yellow-400';
    return 'text-orange-400';
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div
        className="bg-gray-900 rounded-2xl p-8 mx-4 max-w-md w-full border border-gray-700 shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ type: "spring", damping: 20, stiffness: 300 }}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <motion.div
            className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-r from-red-500/20 to-pink-500/20 flex items-center justify-center"
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </motion.div>
          <h3 className="text-xl font-bold text-white mb-2">AI Object Removal</h3>
          <p className="text-gray-400 text-sm">Processing your image with advanced AI...</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-300">Progress</span>
            <span className="text-sm font-medium text-gray-300">{Math.round(progress)}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-3 bg-gradient-to-r from-red-400 to-pink-400 rounded-full"
              initial={{ width: "0%" }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>

        {/* Status Message */}
        <div className="mb-6">
          <p className="text-center text-gray-300 text-sm">{statusMessage}</p>
        </div>

        {/* Model Loading Progress */}
        {modelInfo && modelInfo.loadingProgress < 100 && (
          <div className="mb-6 p-4 bg-gray-800/50 rounded-xl border border-gray-600">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-300">Loading {modelInfo.name}</span>
              <span className="text-sm text-gray-400">{Math.round(modelInfo.loadingProgress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                className="h-2 bg-blue-400 rounded-full"
                initial={{ width: "0%" }}
                animate={{ width: `${modelInfo.loadingProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* GPU Info */}
        {gpuInfo && (
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-600">
              <div className="flex items-center space-x-2">
                <div className={getPerformanceColor(gpuInfo.performance)}>
                  {getGPUIcon(gpuInfo.type)}
                </div>
                <span className="text-sm text-gray-300">GPU Type</span>
              </div>
              <span className="text-sm font-medium text-white capitalize">
                {gpuInfo.type.replace('-', ' ')}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-600">
              <div className="flex items-center space-x-2">
                <div className={getPerformanceColor(gpuInfo.performance)}>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-sm text-gray-300">Performance</span>
              </div>
              <span className={`text-sm font-medium capitalize ${getPerformanceColor(gpuInfo.performance)}`}>
                {gpuInfo.performance}
              </span>
            </div>

            {gpuInfo.acceleration && (
              <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg border border-gray-600">
                <div className="flex items-center space-x-2">
                  <div className={getAccelerationColor(gpuInfo.acceleration)}>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </div>
                  <span className="text-sm text-gray-300">Acceleration</span>
                </div>
                <span className={`text-sm font-medium ${getAccelerationColor(gpuInfo.acceleration)}`}>
                  {gpuInfo.acceleration}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Warning for Intel Graphics */}
        {gpuInfo?.type === 'intel-integrated' && (
          <motion.div
            className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1 }}
          >
            <div className="flex items-start space-x-2">
              <svg className="w-5 h-5 text-orange-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.694-.833-3.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div>
                <p className="text-sm text-orange-400 font-medium">Performance Notice</p>
                <p className="text-xs text-orange-300 mt-1">
                  Intel integrated graphics detected. Consider using a dedicated GPU for optimal performance.
                </p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Animated dots */}
        <div className="flex justify-center space-x-1 mt-6">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="w-2 h-2 bg-red-400 rounded-full"
              animate={{ y: [0, -8, 0] }}
              transition={{
                duration: 0.6,
                repeat: Infinity,
                delay: i * 0.2,
                ease: "easeInOut"
              }}
            />
          ))}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ProcessingOverlay; 