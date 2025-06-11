// src/main.tsx (Corrected)
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from "@sentry/react";
// 1. Import the new integrations from their own packages
import { browserTracingIntegration, replayIntegration } from "@sentry/browser";

import App from './App';
import './index.css';

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

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
