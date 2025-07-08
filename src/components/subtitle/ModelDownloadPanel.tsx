import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WHISPER_MODELS } from '../../config/whisper-models';
import type { WhisperModel } from '../../config/whisper-models';

interface ModelDownloadPanelProps {
  selectedModel: string;
  onModelSelect: (modelId: string) => void;
}

interface ModelStatus {
  downloaded: boolean;
  downloading: boolean;
  progress: number;
  error?: string;
}

export const ModelDownloadPanel: React.FC<ModelDownloadPanelProps> = ({
  selectedModel,
  onModelSelect
}) => {
  const [modelStatuses, setModelStatuses] = useState<Record<string, ModelStatus>>({});
  const [expandedModel, setExpandedModel] = useState<string | null>(null);
  
  // Check cached models on mount
  useEffect(() => {
    checkCachedModels();
  }, []);
  
  // Check which models are already cached
  const checkCachedModels = async () => {
    const statuses: Record<string, ModelStatus> = {};
    
    for (const model of WHISPER_MODELS) {
      // Check if model files exist in cache
      const cacheKey = `model_${model.id}`;
      const cached = await checkModelInCache(cacheKey);
      
      statuses[model.id] = {
        downloaded: cached,
        downloading: false,
        progress: cached ? 100 : 0
      };
    }
    
    setModelStatuses(statuses);
  };
  
  // Check if model exists in cache
  const checkModelInCache = async (cacheKey: string): Promise<boolean> => {
    try {
      const cache = await caches.open('whisper-models');
      const keys = await cache.keys();
      return keys.some(key => key.url.includes(cacheKey));
    } catch {
      return false;
    }
  };
  
  // Handle model download
  const handleDownload = async (model: WhisperModel) => {
    setModelStatuses(prev => ({
      ...prev,
      [model.id]: {
        downloaded: false,
        downloading: true,
        progress: 0
      }
    }));
    
    try {
      // Simulate download progress
      // In real implementation, this would track actual download
      for (let i = 0; i <= 100; i += 10) {
        await new Promise(resolve => setTimeout(resolve, 200));
        
        setModelStatuses(prev => ({
          ...prev,
          [model.id]: {
            ...prev[model.id],
            progress: i
          }
        }));
      }
      
      setModelStatuses(prev => ({
        ...prev,
        [model.id]: {
          downloaded: true,
          downloading: false,
          progress: 100
        }
      }));
    } catch (error) {
      setModelStatuses(prev => ({
        ...prev,
        [model.id]: {
          downloaded: false,
          downloading: false,
          progress: 0,
          error: error instanceof Error ? error.message : 'Download failed'
        }
      }));
    }
  };
  
  // Handle model deletion
  const handleDelete = async (model: WhisperModel) => {
    if (!window.confirm(`Delete ${model.name} from cache?`)) return;
    
    try {
      const cache = await caches.open('whisper-models');
      const keys = await cache.keys();
      
      for (const key of keys) {
        if (key.url.includes(`model_${model.id}`)) {
          await cache.delete(key);
        }
      }
      
      setModelStatuses(prev => ({
        ...prev,
        [model.id]: {
          downloaded: false,
          downloading: false,
          progress: 0
        }
      }));
    } catch (error) {
      console.error('Failed to delete model:', error);
    }
  };
  
  const getModelStatus = (modelId: string): ModelStatus => {
    return modelStatuses[modelId] || {
      downloaded: false,
      downloading: false,
      progress: 0
    };
  };
  
  return (
    <div className="bg-gray-800 rounded-lg p-4 space-y-4">
      <h3 className="text-lg font-medium text-white">Model Management</h3>
      
      {/* Model Selection Dropdown */}
      <div>
        <label className="block text-sm font-medium text-gray-400 mb-2">
          Active Model
        </label>
        <select
          value={selectedModel}
          onChange={(e) => onModelSelect(e.target.value)}
          className="w-full bg-gray-700 text-white rounded px-3 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
        >
          {WHISPER_MODELS.map(model => {
            const status = getModelStatus(model.id);
            return (
              <option key={model.id} value={model.id}>
                {model.name} - {model.size} {status.downloaded ? '✓' : ''}
              </option>
            );
          })}
        </select>
      </div>
      
      {/* Model List */}
      <div className="space-y-2">
        {WHISPER_MODELS.map(model => {
          const status = getModelStatus(model.id);
          const isExpanded = expandedModel === model.id;
          
          return (
            <motion.div
              key={model.id}
              className="bg-gray-700 rounded-lg overflow-hidden"
              initial={false}
              animate={{ height: isExpanded ? 'auto' : 60 }}
            >
              {/* Model Header */}
              <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-gray-600 transition-colors"
                onClick={() => setExpandedModel(isExpanded ? null : model.id)}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${
                    status.downloaded ? 'bg-green-500' : 
                    status.downloading ? 'bg-yellow-500 animate-pulse' : 
                    'bg-gray-500'
                  }`} />
                  <div>
                    <p className="text-white font-medium">{model.name}</p>
                    <p className="text-xs text-gray-400">
                      {model.size} • {model.language}
                    </p>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  {model.id === selectedModel && (
                    <span className="text-xs bg-cyan-600 text-white px-2 py-1 rounded">
                      Active
                    </span>
                  )}
                  <span className="material-symbols-outlined text-gray-400">
                    {isExpanded ? 'expand_less' : 'expand_more'}
                  </span>
                </div>
              </div>
              
              {/* Model Details */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    className="px-4 pb-3 space-y-3"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    {/* Download Size */}
                    <div className="text-sm text-gray-400">
                      Download size: {model.downloadSize}
                    </div>
                    
                    {/* Progress Bar */}
                    {status.downloading && (
                      <div>
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Downloading...</span>
                          <span>{status.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-2 overflow-hidden">
                          <motion.div
                            className="h-full bg-cyan-500"
                            initial={{ width: 0 }}
                            animate={{ width: `${status.progress}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Error Message */}
                    {status.error && (
                      <div className="text-sm text-red-400 flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">error</span>
                        {status.error}
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      {!status.downloaded && !status.downloading && (
                        <motion.button
                          onClick={() => handleDownload(model)}
                          className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded text-sm transition-colors"
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                        >
                          Download Model
                        </motion.button>
                      )}
                      
                      {status.downloaded && (
                        <>
                          <motion.button
                            onClick={() => onModelSelect(model.id)}
                            disabled={model.id === selectedModel}
                            className={`px-3 py-1.5 rounded text-sm transition-colors ${
                              model.id === selectedModel
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                                : 'bg-cyan-600 hover:bg-cyan-700 text-white'
                            }`}
                            whileHover={model.id !== selectedModel ? { scale: 1.05 } : {}}
                            whileTap={model.id !== selectedModel ? { scale: 0.95 } : {}}
                          >
                            Use Model
                          </motion.button>
                          
                          <motion.button
                            onClick={() => handleDelete(model)}
                            className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded text-sm transition-colors"
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            Delete
                          </motion.button>
                        </>
                      )}
                      
                      {status.downloading && (
                        <button
                          className="px-3 py-1.5 bg-gray-600 text-gray-400 rounded text-sm cursor-not-allowed"
                          disabled
                        >
                          Downloading...
                        </button>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      
      {/* Storage Info */}
      <div className="text-xs text-gray-500 pt-2 border-t border-gray-700">
        <p>Models are cached locally for offline use</p>
        <p>First download may take a few minutes depending on model size</p>
      </div>
    </div>
  );
};

export default ModelDownloadPanel; 