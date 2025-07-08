import React from 'react';
import { motion } from 'framer-motion';
import './ModelLoader.css';

interface ModelLoaderProps {
  onInitialize: (quality: 'low' | 'medium' | 'high') => void;
  error: string | null;
  progress: number;
  status: string;
}

export const ModelLoader: React.FC<ModelLoaderProps> = ({
  onInitialize,
  error,
  progress,
  status
}) => {
  return (
    <motion.div 
      className="model-loader"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="loader-content">
        <motion.div 
          className="loader-header"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h1 className="loader-title">AI Face Swap</h1>
          <p className="loader-subtitle">Select model quality to begin</p>
        </motion.div>

        {error && (
          <motion.div 
            className="error-alert"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
            </svg>
            <span>{error}</span>
          </motion.div>
        )}

        <div className="quality-options">
          <motion.button
            className="quality-button demo"
            onClick={() => onInitialize('low')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="quality-icon">🎭</div>
            <h3>Demo Mode</h3>
            <p>Quick preview with simulated effects</p>
            <span className="quality-size">No download required</span>
          </motion.button>

          <motion.button
            className="quality-button standard"
            onClick={() => onInitialize('medium')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
          >
            <div className="quality-icon">⚡</div>
            <h3>Standard Quality</h3>
            <p>Good balance of speed and quality</p>
            <span className="quality-size">~50MB download</span>
          </motion.button>

          <motion.button
            className="quality-button premium"
            onClick={() => onInitialize('high')}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
          >
            <div className="quality-icon">✨</div>
            <h3>Premium Quality</h3>
            <p>Best results with advanced models</p>
            <span className="quality-size">~150MB download</span>
          </motion.button>
        </div>

        {progress > 0 && (
          <motion.div 
            className="loading-progress"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="progress-info">
              <span className="spinner"></span>
              <span>{status || 'Loading models...'}</span>
            </div>
              <div className="progress-bar">
              <motion.div 
                  className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
                />
              </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}; 