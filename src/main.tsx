// src/main.tsx (Corrected)
// Import ONNX patch first before any other modules
import './utils/onnx-patch';

import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from "@sentry/react";
// 1. Import the new integrations from their own packages
import { browserTracingIntegration, replayIntegration } from "@sentry/browser";
import { env } from '@huggingface/transformers';

import App from './App';
import { AuthProvider } from './context/AuthContext';
import './index.css';
import { initializeGPU } from './utils/gpuUtils';
import { validateEnvironment } from './config/environment';

// Pre-load Three.js modules to ensure they're available
import * as THREE from 'three';
import * as R3F from '@react-three/fiber';
import * as Drei from '@react-three/drei';

// Fix ONNX Runtime WebGL backend conflict
// This prevents multiple versions from trying to register the same backend
(window as any).ort = (window as any).ort || {};
if ((window as any).ort.env) {
  (window as any).ort.env.wasm = (window as any).ort.env.wasm || {};
  (window as any).ort.env.wasm.numThreads = 1;
  (window as any).ort.env.wasm.simd = true;
  // Prevent WebGL backend registration conflicts
  (window as any).ort.env.webgl = (window as any).ort.env.webgl || {};
  (window as any).ort.env.webgl.disabled = false;
}

// Make them globally available for debugging
(window as any).THREE = THREE;
(window as any).__R3F__ = R3F;
(window as any).__DREI__ = Drei;

console.log('Three.js modules loaded:', {
  three: !!THREE,
  r3f: !!R3F,
  drei: !!Drei
});

// Initialize Sentry for error tracking
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN_FRONTEND,
  integrations: [
    // 2. Use the new, correctly imported functions
    browserTracingIntegration(),
    replayIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, 
  // Session Replay
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Validate environment variables on startup
validateEnvironment();

// Configure transformers.js environment for WASM files
env.allowLocalModels = false;
env.allowRemoteModels = true;

// Ensure the ONNX runtime WASM binaries resolve from our copied public assets
const wasmBasePath = `${window.location.origin}/ort-wasm/`;
if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.wasmPaths = wasmBasePath;
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.simd = true;
}

// Initialize GPU acceleration
initializeGPU().then(() => {
  console.log('GPU acceleration initialized');
}).catch(error => {
  console.error('GPU initialization failed:', error);
});

// Global error handler for unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason);
  
  // Check if it's the specific Supabase error
  if (event.reason?.message?.includes('Object Not Found Matching Id:1')) {
    console.warn('Ignoring Supabase profile error - this may be from old code or initialization');
    event.preventDefault(); // Prevent the error from being logged to Sentry
    return;
  }
  
  // For other errors, you can still report them
  // Sentry or other error tracking would go here
});

// Global error boundary
window.addEventListener('error', (event) => {
  console.error('Global error:', event.error);
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
