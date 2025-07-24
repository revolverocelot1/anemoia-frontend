import React from 'react';

interface TranscriptionLoadingOverlayProps {
  isLoading: boolean;
  progress?: number;
  message?: string;
}

export const TranscriptionLoadingOverlay: React.FC<TranscriptionLoadingOverlayProps> = ({
  isLoading,
  progress = 0,
  message = 'Processing...'
}) => {
  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center">
      <div className="bg-gray-900 rounded-lg p-8 max-w-md w-full mx-4 shadow-xl">
        <div className="text-center">
          <div className="mb-4">
            <div className="w-16 h-16 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
          
          <h3 className="text-xl font-semibold text-white mb-2">Transcribing Video</h3>
          <p className="text-gray-400 mb-4">{message}</p>
          
          {progress > 0 && (
            <div className="w-full bg-gray-800 rounded-full h-2 mb-2">
              <div 
                className="bg-purple-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
          
          <p className="text-sm text-gray-500">
            {progress > 0 ? `${progress}% complete` : 'Initializing...'}
          </p>
        </div>
      </div>
    </div>
  );
}; 