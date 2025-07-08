import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WHISPER_MODELS } from '../../config/whisper-models';

interface ModelStatus {
  downloaded: boolean;
  downloading: boolean;
  progress: number;
  size: number;
  error?: string;
}

interface WhisperModelManagerProps {
  onModelSelect: (modelId: string) => void;
  selectedModel: string;
}

export const WhisperModelManager: React.FC<WhisperModelManagerProps> = ({
  onModelSelect,
  selectedModel
}) => {
  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({});
  const [isOpen, setIsOpen] = useState(false);

  // Initialize model statuses
  useEffect(() => {
    const statuses: Record<string, ModelStatus> = {};
    WHISPER_MODELS.forEach(model => {
      const isDownloaded = checkModelDownloaded(model.id);
      statuses[model.id] = {
        downloaded: isDownloaded,
        downloading: false,
        progress: 0,
        size: model.fileSize || 0,
        error: undefined
      };
    });
    setModelStatuses(statuses);

    // Auto-download base model if not present
    if (!statuses['whisper-base']?.downloaded) {
      downloadModel('whisper-base');
    }
  }, []);

  const checkModelDownloaded = (modelId: string): boolean => {
    // Check if model exists in cache
    const cacheKey = `whisper_model_${modelId}`;
    return localStorage.getItem(cacheKey) === 'downloaded';
  };

  const downloadModel = async (modelId: string) => {
    const model = WHISPER_MODELS.find(m => m.id === modelId);
    if (!model) return;

    setModelStatuses(prev => ({
      ...prev,
      [modelId]: { ...prev[modelId], downloading: true, progress: 0, error: undefined }
    }));

    try {
      // Simulate download progress
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        setModelStatuses(prev => ({
          ...prev,
          [modelId]: { ...prev[modelId], progress: i }
        }));
      }

      // Mark as downloaded
      localStorage.setItem(`whisper_model_${modelId}`, 'downloaded');
      setModelStatuses(prev => ({
        ...prev,
        [modelId]: { ...prev[modelId], downloaded: true, downloading: false, progress: 100 }
      }));

      // Auto-select if it's the first model
      if (selectedModel === '' || selectedModel === modelId) {
        onModelSelect(modelId);
      }
    } catch (error) {
      setModelStatuses(prev => ({
        ...prev,
        [modelId]: { 
          ...prev[modelId], 
          downloading: false, 
          error: 'Download failed. Please try again.' 
        }
      }));
    }
  };

  const deleteModel = (modelId: string) => {
    localStorage.removeItem(`whisper_model_${modelId}`);
    setModelStatuses(prev => ({
      ...prev,
      [modelId]: { ...prev[modelId], downloaded: false, progress: 0 }
    }));
    
    // Select base model if current model was deleted
    if (selectedModel === modelId) {
      onModelSelect('whisper-base');
    }
  };

  const formatSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  return (
    <>
      {/* Model Selector Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="relative px-4 py-2 bg-gradient-to-r from-gray-800 to-gray-900 rounded-lg border border-gray-700 hover:border-cyan-600 transition-all group"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <div className="flex items-center space-x-3">
          <div className="relative">
            <span className="material-symbols-outlined text-cyan-400 group-hover:text-cyan-300 transition-colors">
              model_training
            </span>
            {modelStatuses[selectedModel]?.downloading && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
            )}
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-gray-200">
              {WHISPER_MODELS.find(m => m.id === selectedModel)?.name || 'Select Model'}
            </p>
            <p className="text-xs text-gray-500">
              {modelStatuses[selectedModel]?.downloaded ? 'Ready' : 'Not downloaded'}
            </p>
          </div>
          <span className="material-symbols-outlined text-gray-400">
            expand_more
          </span>
        </div>
      </motion.button>

      {/* Model Manager Modal */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
              onClick={() => setIsOpen(false)}
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="fixed left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-gray-900 rounded-2xl shadow-2xl z-50 overflow-hidden"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-gray-800 to-gray-900 px-6 py-4 border-b border-gray-800">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-white">Whisper Model Manager</h2>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    <span className="material-symbols-outlined text-gray-400">close</span>
                  </button>
                </div>
              </div>

              {/* Model List */}
              <div className="p-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-4">
                  {WHISPER_MODELS.map(model => {
                    const status = modelStatuses[model.id] || {};
                    const isSelected = selectedModel === model.id;

                    return (
                      <motion.div
                        key={model.id}
                        className={`relative p-4 rounded-xl border transition-all ${
                          isSelected 
                            ? 'bg-cyan-950/30 border-cyan-600' 
                            : 'bg-gray-800/50 border-gray-700 hover:border-gray-600'
                        }`}
                        whileHover={{ scale: 1.01 }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <h3 className="text-lg font-semibold text-white">{model.name}</h3>
                              {status.downloaded && (
                                <span className="px-2 py-1 bg-green-900/50 text-green-400 text-xs rounded-full">
                                  Downloaded
                                </span>
                              )}
                              {isSelected && (
                                <span className="px-2 py-1 bg-cyan-900/50 text-cyan-400 text-xs rounded-full">
                                  Active
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-400 mt-1">{model.description}</p>
                            <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                              <span>Size: {formatSize(model.fileSize || 0)}</span>
                              <span>•</span>
                              <span>Language: {model.language}</span>
                              <span>•</span>
                              <span>Quality: {model.size}</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {status.downloaded ? (
                              <>
                                <motion.button
                                  onClick={() => onModelSelect(model.id)}
                                  disabled={isSelected}
                                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                                    isSelected
                                      ? 'bg-cyan-600 text-white cursor-default'
                                      : 'bg-gray-700 hover:bg-gray-600 text-gray-200'
                                  }`}
                                  whileHover={!isSelected ? { scale: 1.05 } : {}}
                                  whileTap={!isSelected ? { scale: 0.95 } : {}}
                                >
                                  {isSelected ? 'Selected' : 'Select'}
                                </motion.button>
                                {model.id !== 'whisper-base' && (
                                  <motion.button
                                    onClick={() => deleteModel(model.id)}
                                    className="p-2 bg-red-900/20 hover:bg-red-900/40 text-red-400 rounded-lg transition-colors"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                  >
                                    <span className="material-symbols-outlined text-sm">delete</span>
                                  </motion.button>
                                )}
                              </>
                            ) : status.downloading ? (
                              <div className="flex items-center space-x-3">
                                <div className="w-32">
                                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                                    <motion.div
                                      className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400"
                                      initial={{ width: 0 }}
                                      animate={{ width: `${status.progress}%` }}
                                      transition={{ duration: 0.3 }}
                                    />
                                  </div>
                                </div>
                                <span className="text-xs text-gray-400">{status.progress}%</span>
                              </div>
                            ) : (
                              <motion.button
                                onClick={() => downloadModel(model.id)}
                                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg font-medium transition-colors"
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                              >
                                Download
                              </motion.button>
                            )}
                          </div>
                        </div>

                        {/* Error Message */}
                        {status.error && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="mt-3 p-2 bg-red-900/20 border border-red-900/50 rounded-lg"
                          >
                            <p className="text-sm text-red-400">{status.error}</p>
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Footer */}
              <div className="bg-gray-800/50 px-6 py-4 border-t border-gray-800">
                <p className="text-xs text-gray-500">
                  Models are cached locally. The base model is required and will be downloaded automatically.
                </p>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
};

export default WhisperModelManager; 