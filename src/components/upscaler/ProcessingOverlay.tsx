import React from 'react';
import { motion } from 'framer-motion';

interface ProcessingOverlayProps {
  statusMessage: string;
  progress: number;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ statusMessage, progress }) => {
  return (
    <motion.div
      className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="bg-gray-900/50 backdrop-blur-xl rounded-2xl p-8 max-w-md w-full mx-4 border border-gray-700/30 shadow-2xl"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
      >
        {/* AI Processing Animation */}
        <div className="flex justify-center mb-8">
          <div className="relative">
            {/* Outer rotating ring */}
            <motion.div
              className="w-20 h-20 rounded-full border-4 border-blue-500/20 border-t-blue-500"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            />
            
            {/* Inner pulsing core */}
            <motion.div
              className="absolute inset-3 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"
              animate={{ scale: [1, 1.2, 1], opacity: [0.6, 1, 0.6] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
            
            {/* Central AI icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Status Text */}
        <div className="text-center mb-6">
          <motion.h3 
            className="text-2xl font-bold text-white mb-2"
            key={statusMessage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {statusMessage}
          </motion.h3>
          <p className="text-gray-400">
            AI is enhancing your image with advanced algorithms...
          </p>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Processing</span>
            <span className="text-sm font-semibold text-blue-400">{Math.round(progress)}%</span>
          </div>
          
          <div className="w-full bg-gray-800/50 rounded-full h-3 overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full relative overflow-hidden"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            >
              {/* Animated shine effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                animate={{ x: ['0%', '100%'] }}
                transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          </div>
        </div>

        {/* Processing Steps Indicator */}
        <div className="mt-6 flex justify-center space-x-2">
          {['Load', 'Process', 'Enhance', 'Complete'].map((step, index) => {
            const isActive = progress > (index * 25);
            const isCurrent = progress >= (index * 25) && progress < ((index + 1) * 25);
            
            return (
              <motion.div
                key={step}
                className={`flex flex-col items-center space-y-1 ${
                  isActive ? 'text-blue-400' : 'text-gray-600'
                }`}
                initial={{ opacity: 0.5 }}
                animate={{ opacity: isActive ? 1 : 0.5 }}
                transition={{ duration: 0.3 }}
              >
                <motion.div
                  className={`w-3 h-3 rounded-full border-2 ${
                    isActive 
                      ? 'bg-blue-500 border-blue-500' 
                      : 'border-gray-600'
                  }`}
                  animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 1, repeat: Infinity }}
                />
                <span className="text-xs">{step}</span>
              </motion.div>
            );
          })}
        </div>

        {/* Technical Info */}
        <motion.div 
          className="mt-6 p-4 bg-gray-800/30 rounded-lg border border-gray-700/30"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>GPU Accelerated Processing</span>
          </div>
          <div className="flex items-center space-x-2 text-sm text-gray-400 mt-1">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
            <span>Deep Learning Enhancement</span>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

export default ProcessingOverlay; 