import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GPUInfo {
  type: string;
  vendor: string;
  device: string;
  acceleration: string;
  performance: 'high' | 'medium' | 'low';
  warningMessage?: string;
}

interface ModelInfo {
  initialized: boolean;
  gpuInfo: GPUInfo | null;
  currentModel: string;
  performanceStats: {
    lastInferenceTime: number;
    averageTime: number;
    totalInferences: number;
  };
  hasNeuralAcceleration: boolean;
}

interface ModelStatusIndicatorProps {
  isLoading: boolean;
  modelInfo: ModelInfo | null;
  onDismiss?: () => void;
}

const ModelStatusIndicator: React.FC<ModelStatusIndicatorProps> = ({
  isLoading,
  modelInfo,
  onDismiss
}) => {
  const [showDetails, setShowDetails] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Show details automatically if there's a warning
  useEffect(() => {
    if (modelInfo?.gpuInfo?.warningMessage) {
      setShowDetails(true);
    }
  }, [modelInfo?.gpuInfo?.warningMessage]);

  if (dismissed || (!isLoading && !modelInfo)) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const getGPUStatusIcon = () => {
    if (!modelInfo?.gpuInfo) return '🖥️';
    
    switch (modelInfo.gpuInfo.type) {
      case 'nvidia-dedicated':
        return '🎮'; // NVIDIA dedicated
      case 'amd-dedicated':
        return '🔥'; // AMD dedicated
      case 'dedicated-other':
        return '⚡'; // Other dedicated
      case 'intel-integrated':
        return '📱'; // Intel integrated
      case 'integrated-other':
        return '💻'; // Other integrated
      default:
        return '🖥️'; // Unknown/CPU
    }
  };

  const getPerformanceColor = () => {
    if (!modelInfo?.gpuInfo) return 'text-gray-500';
    
    switch (modelInfo.gpuInfo.performance) {
      case 'high':
        return 'text-green-600';
      case 'medium':
        return 'text-yellow-600';
      case 'low':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getAccelerationBadge = () => {
    if (!modelInfo?.gpuInfo) return 'CPU';
    
    switch (modelInfo.gpuInfo.acceleration) {
      case 'webgpu':
        return 'WebGPU';
      case 'webgl2':
        return 'WebGL2';
      case 'webgl':
        return 'WebGL';
      default:
        return 'CPU';
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        className="fixed top-4 right-4 max-w-sm z-50"
      >
        <div className={`
          bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden
          ${modelInfo?.gpuInfo?.warningMessage ? 'border-yellow-300' : ''}
        `}>
          {/* Header */}
          <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{getGPUStatusIcon()}</span>
              <div>
                <h3 className="font-semibold text-gray-800">
                  {isLoading ? 'Initializing AI Engine' : 'AI Engine Status'}
                </h3>
                {modelInfo?.gpuInfo && (
                  <p className="text-xs text-gray-600">
                    {modelInfo.gpuInfo.vendor} {modelInfo.gpuInfo.device}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {/* Acceleration Badge */}
              {modelInfo?.gpuInfo && (
                <span className={`
                  px-2 py-1 rounded-full text-xs font-medium
                  ${modelInfo.gpuInfo.acceleration === 'webgpu' ? 'bg-green-100 text-green-800' :
                    modelInfo.gpuInfo.acceleration === 'webgl2' ? 'bg-blue-100 text-blue-800' :
                    modelInfo.gpuInfo.acceleration === 'webgl' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'}
                `}>
                  {getAccelerationBadge()}
                </span>
              )}
              {/* Performance indicator */}
              {modelInfo?.gpuInfo && (
                <div className={`w-2 h-2 rounded-full ${
                  modelInfo.gpuInfo.performance === 'high' ? 'bg-green-500' :
                  modelInfo.gpuInfo.performance === 'medium' ? 'bg-yellow-500' :
                  'bg-red-500'
                }`} />
              )}
              <button
                onClick={handleDismiss}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Loading indicator */}
          {isLoading && (
            <div className="p-3">
              <div className="flex items-center space-x-2">
                <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                <span className="text-sm text-gray-600">Detecting GPU capabilities...</span>
              </div>
            </div>
          )}

          {/* Warning message */}
          {modelInfo?.gpuInfo?.warningMessage && (
            <div className="p-3 bg-yellow-50 border-t border-yellow-200">
              <div className="flex items-start space-x-2">
                <span className="text-yellow-600 mt-0.5">⚠️</span>
                <div>
                  <p className="text-sm text-yellow-800 font-medium">Performance Notice</p>
                  <p className="text-xs text-yellow-700 mt-1">
                    {modelInfo.gpuInfo.warningMessage}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Expandable details */}
          {modelInfo && (
            <>
              <div className="px-3 py-2 border-t border-gray-100">
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center justify-between w-full text-sm text-gray-600 hover:text-gray-800 transition-colors"
                >
                  <span>Technical Details</span>
                  <span className={`transition-transform ${showDetails ? 'rotate-180' : ''}`}>
                    ▼
                  </span>
                </button>
              </div>

              <AnimatePresence>
                {showDetails && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="p-3 bg-gray-50 text-xs space-y-2">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <span className="font-medium text-gray-600">Model:</span>
                          <p className="text-gray-800">{modelInfo.currentModel}</p>
                        </div>
                        <div>
                          <span className="font-medium text-gray-600">Performance:</span>
                          <p className={getPerformanceColor()}>
                            {modelInfo.gpuInfo?.performance?.toUpperCase() || 'Unknown'}
                          </p>
                        </div>
                      </div>
                      
                      {modelInfo.performanceStats.totalInferences > 0 && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="font-medium text-gray-600">Performance Stats:</span>
                          <div className="grid grid-cols-2 gap-2 mt-1">
                            <div>
                              <p className="text-gray-600">Last inference:</p>
                              <p className="text-gray-800">
                                {modelInfo.performanceStats.lastInferenceTime.toFixed(1)}ms
                              </p>
                            </div>
                            <div>
                              <p className="text-gray-600">Average time:</p>
                              <p className="text-gray-800">
                                {modelInfo.performanceStats.averageTime.toFixed(1)}ms
                              </p>
                            </div>
                          </div>
                          <div className="mt-1">
                            <p className="text-gray-600">
                              Total inferences: {modelInfo.performanceStats.totalInferences}
                            </p>
                          </div>
                        </div>
                      )}

                      {modelInfo.gpuInfo && (
                        <div className="pt-2 border-t border-gray-200">
                          <span className="font-medium text-gray-600">GPU Details:</span>
                          <div className="mt-1 space-y-1">
                            <p className="text-gray-800">
                              <span className="text-gray-600">Type:</span> {modelInfo.gpuInfo.type}
                            </p>
                            <p className="text-gray-800">
                              <span className="text-gray-600">Acceleration:</span> {modelInfo.gpuInfo.acceleration}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ModelStatusIndicator; 