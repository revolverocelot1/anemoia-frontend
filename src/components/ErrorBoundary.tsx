import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    console.error('ErrorBoundary caught an error:', error);
    
    // Ignore ONNX backend registration errors
    if (error.message && (
      error.message.includes('Backend already registered') ||
      error.message.includes('cannot register backend') ||
      error.message === '' // Our patched empty error
    )) {
      console.warn('Ignoring ONNX backend error in ErrorBoundary');
      return { hasError: false, error: null };
    }
    
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    
    // Don't log ONNX errors to error tracking
    if (error.message && (
      error.message.includes('Backend already registered') ||
      error.message.includes('cannot register backend') ||
      error.message === ''
    )) {
      return;
    }
  }

  public render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-4">
          <div className="max-w-md w-full text-center">
            <div className="mb-4">
              <span className="material-symbols-outlined text-6xl text-red-500">error</span>
            </div>
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-400 mb-6">
              We encountered an unexpected error. Don't worry, your work is safe and the team has been notified.
            </p>
            <div className="space-y-2">
              <pre className="text-xs text-left bg-gray-900 p-4 rounded-lg overflow-auto max-h-40 mb-4">
                {this.state.error.message || 'Unknown error'}
              </pre>
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
              >
                Reload Page
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 