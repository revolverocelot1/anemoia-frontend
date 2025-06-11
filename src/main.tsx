import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from "@sentry/react";
import App from './App';
import './index.css';

// Initialize Sentry for error tracking
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN_FRONTEND, // Reads from Render's env vars
  integrations: [Sentry.browserTracing(), Sentry.replay()],
  tracesSampleRate: 1.0,
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