import React from 'react';
import { motion } from 'framer-motion';
import { X, Download, Check, Loader, Globe, FileText } from 'lucide-react';

interface ModelInfo {
  name: string;
  size: number;
  language?: string;
}

interface ModelSelectorProps {
  models: ModelInfo[];
  selectedModel: string;
  isLoading: boolean;
  loadProgress: number;
  onSelect: (modelName: string) => void;
  onClose: () => void;
}

const ModelSelector: React.FC<ModelSelectorProps> = ({
  models,
  selectedModel,
  isLoading,
  loadProgress,
  onSelect,
  onClose
}) => {
  const formatSize = (mb: number): string => {
    if (mb < 1000) {
      return `${mb} MB`;
    }
    return `${(mb / 1000).toFixed(1)} GB`;
  };

  const getLanguageLabel = (language?: string): string => {
    if (!language) return 'Multilingual';
    return language === 'english' ? 'English Only' : language;
  };

  const getModelDescription = (model: ModelInfo): string => {
    const descriptions: Record<string, string> = {
      'whisper-tiny': 'Fastest, least accurate. Good for quick drafts.',
      'whisper-tiny.en': 'Fast English-only model. Better accuracy for English.',
      'whisper-small': 'Balanced speed and accuracy. Good for most use cases.',
      'whisper-small.en': 'Good English accuracy with reasonable speed.',
      'whisper-base': 'Higher accuracy, slower processing.',
      'whisper-base.en': 'High English accuracy, moderate speed.',
      'distil-small.en': 'Optimized English model. Fast with good accuracy.'
    };
    return descriptions[model.name] || 'No description available';
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-gray-900 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Select Whisper Model</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Loading progress */}
        {isLoading && (
          <div className="mb-6 p-4 bg-gray-800 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <Loader className="w-5 h-5 text-purple-500 animate-spin" />
              <span className="text-white">Loading model...</span>
              <span className="text-gray-400 ml-auto">{Math.round(loadProgress)}%</span>
            </div>
            <div className="w-full bg-gray-700 rounded-full h-2">
              <motion.div
                className="bg-purple-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${loadProgress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        )}

        {/* Model list */}
        <div className="space-y-3 overflow-y-auto max-h-[50vh]">
          {models.map((model) => (
            <motion.button
              key={model.name}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onSelect(model.name)}
              disabled={isLoading}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                selectedModel === model.name
                  ? 'border-purple-500 bg-purple-500/10'
                  : 'border-gray-700 bg-gray-800 hover:border-gray-600'
              } ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-lg font-semibold text-white">
                      {model.name}
                    </h3>
                    {selectedModel === model.name && (
                      <Check className="w-5 h-5 text-purple-500" />
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-3">
                    {getModelDescription(model)}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-gray-500">
                      <FileText className="w-4 h-4" />
                      <span>{formatSize(model.size)}</span>
                    </div>
                    <div className="flex items-center gap-1 text-gray-500">
                      <Globe className="w-4 h-4" />
                      <span>{getLanguageLabel(model.language)}</span>
                    </div>
                  </div>
                </div>
                
                <Download className="w-5 h-5 text-gray-400 ml-4" />
              </div>
            </motion.button>
          ))}
        </div>

        {/* Info */}
        <div className="mt-6 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <p className="text-sm text-blue-300">
            <strong>Note:</strong> Models are downloaded from Hugging Face and cached locally. 
            First download may take a few minutes depending on your connection speed.
          </p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ModelSelector; 