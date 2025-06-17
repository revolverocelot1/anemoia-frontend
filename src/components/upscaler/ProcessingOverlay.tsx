import React from 'react';
import { motion } from 'framer-motion';

interface ProcessingOverlayProps {
  statusMessage: string;
  progress: number;
}

const ProcessingOverlay: React.FC<ProcessingOverlayProps> = ({ statusMessage, progress }) => {
  return (
    <motion.div
      className="absolute inset-0 bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center z-50"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="text-center p-8 rounded-lg">
        <div className="loading-spinner mb-6 mx-auto"></div>
        <h3 className="text-2xl font-bold text-white mb-2">{statusMessage}</h3>
        <p className="text-gray-300">Please wait, this may take a moment...</p>
        
        <div className="w-full max-w-sm mt-6">
          <div className="progress-bar">
            <motion.div
              className="progress-bar-fill"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5, ease: 'easeInOut' }}
            />
          </div>
          <p className="text-right text-sm text-gray-400">{Math.round(progress)}%</p>
        </div>
      </div>
    </motion.div>
  );
};

export default ProcessingOverlay; 