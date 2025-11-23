
import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import './i18n/config';
import { captureError } from './utils/logger';

if (typeof window !== 'undefined' && import.meta.env.MODE !== 'test') {
  window.addEventListener('error', (event) => {
    captureError(event.error ?? event.message, {
      message: 'Uncaught window error',
      context: { source: 'window' },
    });
  });

  window.addEventListener('unhandledrejection', (event) => {
    captureError(event.reason, {
      message: 'Unhandled promise rejection',
      context: { source: 'promise' },
    });
  });
}

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
