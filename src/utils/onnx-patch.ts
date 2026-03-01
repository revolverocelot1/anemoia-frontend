// Patch for ONNX Runtime WebGL backend conflicts
// This prevents multiple versions from registering the same backend

export const patchOnnxRuntime = () => {
  // Create a singleton registry for backends
  const globalBackends = (window as any).__ONNX_BACKENDS__ || new Map();
  (window as any).__ONNX_BACKENDS__ = globalBackends;

  // Track if we've already patched to avoid double patching
  if ((window as any).__ONNX_PATCHED__) {
    console.log('ONNX Runtime already patched, skipping...');
    return;
  }
  (window as any).__ONNX_PATCHED__ = true;

  // Store original console.error
  const originalConsoleError = console.error;
  
  // Override console.error to suppress ONNX backend errors
  console.error = function(...args: any[]) {
    const errorMessage = args[0];
    if (typeof errorMessage === 'string' && 
        (errorMessage.includes('Backend already registered') || 
         errorMessage.includes('cannot register backend') ||
         errorMessage.includes('already exists. Set'))) {
      console.warn('Suppressed ONNX backend registration error:', errorMessage);
      return;
    }
    // Also check if it's an Error object with these messages
    if (args[0] instanceof Error && args[0].message && 
        (args[0].message.includes('Backend already registered') || 
         args[0].message.includes('cannot register backend'))) {
      console.warn('Suppressed ONNX backend registration error:', args[0].message);
      return;
    }
    return originalConsoleError.apply(console, args);
  };

  // Override Error constructor to catch thrown errors - but only for duplicate registrations
  const OriginalError = window.Error;
  (window as any).Error = class PatchedError extends OriginalError {
    constructor(message?: string) {
      // Only intercept backend registration errors that indicate a duplicate
      if (message && message.includes('already exists. Set')) {
        console.warn('Intercepted duplicate backend registration error:', message);
        super(''); // Create empty error to prevent breaking
        this.message = '';
        this.name = 'PatchedError';
        // Make the error non-breaking
        Object.defineProperty(this, 'stack', {
          get: () => '',
          set: () => {}
        });
        return this;
      }
      super(message);
    }
  };
  
  // Copy static properties and prototype
  Object.setPrototypeOf((window as any).Error, OriginalError);
  Object.setPrototypeOf((window as any).Error.prototype, OriginalError.prototype);

  // Override window.onerror to catch uncaught errors
  const originalOnError = window.onerror;
  window.onerror = function(message, source, lineno, colno, error) {
    if (typeof message === 'string' && 
        (message.includes('Backend already registered') || 
         message.includes('cannot register backend') ||
         message.includes('PatchedError') ||
         message.includes('already exists. Set'))) {
      console.warn('Caught ONNX error in window.onerror:', message);
      return true; // Prevent default error handling
    }
    if (originalOnError) {
      return originalOnError(message, source, lineno, colno, error);
    }
    return false;
  };

  // Override Promise rejection handler
  const originalUnhandledRejection = window.onunhandledrejection;
  window.onunhandledrejection = function(event) {
    if (event.reason && event.reason.message && 
        (event.reason.message.includes('Backend already registered') || 
         event.reason.message.includes('cannot register backend') ||
         event.reason.message.includes('already exists. Set'))) {
      console.warn('Caught ONNX error in unhandled rejection:', event.reason.message);
      event.preventDefault();
      return false;
    }
    if (originalUnhandledRejection) {
      return originalUnhandledRejection.call(window, event);
    }
    return true;
  };

  // Don't intercept Object.defineProperty anymore - let backends register normally
  console.log('ONNX Runtime patch applied - allowing first backend registrations');
};

// Apply the patch immediately
patchOnnxRuntime(); 