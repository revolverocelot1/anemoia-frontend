import React from 'react';
import { motion } from 'framer-motion';

interface LoadingFallbackProps {
  message?: string;
  showProgress?: boolean;
  progress?: number;
  error?: Error | null;
  onRetry?: () => void;
}

const LoadingFallback: React.FC<LoadingFallbackProps> = ({
  message = 'Loading resources...',
  showProgress = false,
  progress = 0,
  error = null,
  onRetry
}) => {
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white p-6">
        <div className="max-w-md w-full bg-gray-900 rounded-xl p-8 shadow-2xl border border-red-500/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="material-symbols-outlined text-4xl text-red-500">warning</span>
            <h2 className="text-2xl font-bold">Loading Failed</h2>
          </div>
          
          <p className="text-gray-300 mb-4">
            {error.message || 'Failed to load required resources. This might be due to network issues or browser compatibility.'}
          </p>
          
          <div className="space-y-3">
            {onRetry && (
              <button
                onClick={onRetry}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition-colors"
              >
                Try Again
              </button>
            )}
            <button
              onClick={() => window.location.reload()}
              className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg font-semibold transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-950 text-white">
      <div className="text-center">
        <motion.div
          animate={{
            rotate: 360
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "linear"
          }}
          className="w-16 h-16 mx-auto mb-6"
        >
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeDasharray="31.415926535897932"
              strokeDashoffset="10.471975511965978"
              className="text-blue-500"
            />
          </svg>
        </motion.div>
        
        <h2 className="text-2xl font-semibold mb-2">{message}</h2>
        
        {showProgress && (
          <div className="w-64 mx-auto mt-4">
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-600 to-purple-600"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <p className="text-sm text-gray-400 mt-2">{Math.round(progress)}%</p>
          </div>
        )}
        
        <p className="text-gray-400 text-sm mt-4">
          This may take a moment on first load...
        </p>
      </div>
    </div>
  );
};

export default LoadingFallback; 