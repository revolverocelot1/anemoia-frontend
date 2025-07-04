// src/main.tsx (Corrected)
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

// Configure transformers.js environment for WASM files
env.allowLocalModels = false;
env.allowRemoteModels = true;

// Configure WASM paths if available
if (env.backends?.onnx?.wasm) {
    env.backends.onnx.wasm.wasmPaths = '/';
}

// Initialize GPU acceleration
initializeGPU().then(() => {
  console.log('GPU acceleration initialized');
}).catch(error => {
  console.error('GPU initialization failed:', error);
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
