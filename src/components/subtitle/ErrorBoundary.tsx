import { Component, ErrorInfo, ReactNode } from 'react';
import { motion } from 'framer-motion';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class SubtitleErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Subtitle Editor Error:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Log to error reporting service
    this.logErrorToService(error, errorInfo);
  }

  private logErrorToService(error: Error, errorInfo: ErrorInfo) {
    // In production, send to error tracking service
    if (process.env.NODE_ENV === 'production') {
      // Example: Sentry, LogRocket, etc.
      console.error('Error logged to service:', {
        error: error.toString(),
        stack: error.stack,
        componentStack: errorInfo.componentStack
      });
    }
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.state.errorInfo!);
      }

      return (
        <motion.div
          className="min-h-screen bg-gray-900 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="max-w-2xl w-full bg-gray-800 rounded-lg shadow-xl overflow-hidden">
            <div className="bg-red-600 p-4">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span className="material-symbols-outlined">error</span>
                Subtitle Editor Error
              </h2>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-2">What happened?</h3>
                <p className="text-gray-300">{this.state.error.message}</p>
              </div>
              
              {process.env.NODE_ENV === 'development' && (
                <details className="bg-gray-900 rounded p-4">
                  <summary className="cursor-pointer text-gray-400 hover:text-white">
                    Technical Details
                  </summary>
                  <pre className="mt-2 text-xs text-gray-500 overflow-auto">
                    {this.state.error.stack}
                    {this.state.errorInfo?.componentStack}
                  </pre>
                </details>
              )}
              
              <div className="flex gap-3">
                <motion.button
                  onClick={this.handleReset}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Try Again
                </motion.button>
                
                <motion.button
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  Reload Page
                </motion.button>
              </div>
              
              <div className="text-sm text-gray-500">
                <p>Your work has been auto-saved. You can safely reload the page.</p>
              </div>
            </div>
          </div>
        </motion.div>
      );
    }

    return this.props.children;
  }
}

// Error handling utilities
export class SubtitleError extends Error {
  constructor(
    message: string,
    public code: string,
    public recoverable: boolean = true
  ) {
    super(message);
    this.name = 'SubtitleError';
  }
}

export const ErrorCodes = {
  MODEL_LOAD_FAILED: 'MODEL_LOAD_FAILED',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  VIDEO_LOAD_FAILED: 'VIDEO_LOAD_FAILED',
  AUDIO_EXTRACTION_FAILED: 'AUDIO_EXTRACTION_FAILED',
  EXPORT_FAILED: 'EXPORT_FAILED',
  SAVE_FAILED: 'SAVE_FAILED',
  INVALID_SUBTITLE_FORMAT: 'INVALID_SUBTITLE_FORMAT',
  BROWSER_NOT_SUPPORTED: 'BROWSER_NOT_SUPPORTED',
  WEBGPU_NOT_AVAILABLE: 'WEBGPU_NOT_AVAILABLE',
  INSUFFICIENT_MEMORY: 'INSUFFICIENT_MEMORY',
  NETWORK_ERROR: 'NETWORK_ERROR'
} as const;

// Error recovery strategies
export const errorRecovery = {
  [ErrorCodes.MODEL_LOAD_FAILED]: {
    message: 'Failed to load AI model. Please check your internet connection and try again.',
    actions: ['retry', 'chooseAnotherModel', 'useManualMode']
  },
  [ErrorCodes.TRANSCRIPTION_FAILED]: {
    message: 'Transcription failed. The audio might be too long or unclear.',
    actions: ['retry', 'splitAudio', 'useManualMode']
  },
  [ErrorCodes.VIDEO_LOAD_FAILED]: {
    message: 'Failed to load video. Please check the file format is supported.',
    actions: ['chooseAnotherFile', 'convertVideo']
  },
  [ErrorCodes.AUDIO_EXTRACTION_FAILED]: {
    message: 'Failed to extract audio from video. The video might not contain audio.',
    actions: ['chooseAnotherFile', 'useManualMode']
  },
  [ErrorCodes.EXPORT_FAILED]: {
    message: 'Failed to export subtitles. Please try a different format.',
    actions: ['retry', 'chooseAnotherFormat', 'downloadAsText']
  },
  [ErrorCodes.SAVE_FAILED]: {
    message: 'Failed to save project. Your browser storage might be full.',
    actions: ['retry', 'clearStorage', 'downloadBackup']
  },
  [ErrorCodes.BROWSER_NOT_SUPPORTED]: {
    message: 'Your browser doesn\'t support required features. Please use Chrome, Edge, or Firefox.',
    actions: ['downloadChrome', 'downloadFirefox']
  },
  [ErrorCodes.WEBGPU_NOT_AVAILABLE]: {
    message: 'WebGPU is not available. Using CPU mode which might be slower.',
    actions: ['continue', 'enableWebGPU']
  }
};

// Global error handler
export const handleSubtitleError = (error: unknown): SubtitleError => {
  if (error instanceof SubtitleError) {
    return error;
  }
  
  if (error instanceof Error) {
    // Map common errors to subtitle errors
    if (error.message.includes('Failed to fetch')) {
      return new SubtitleError(
        'Network error. Please check your internet connection.',
        ErrorCodes.NETWORK_ERROR
      );
    }
    
    if (error.message.includes('memory') || error.message.includes('Memory')) {
      return new SubtitleError(
        'Out of memory. Try using a smaller model or shorter video.',
        ErrorCodes.INSUFFICIENT_MEMORY
      );
    }
    
    return new SubtitleError(error.message, 'UNKNOWN_ERROR');
  }
  
  return new SubtitleError('An unexpected error occurred', 'UNKNOWN_ERROR');
};

export default SubtitleErrorBoundary; 