import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Automatically prefix /api calls with VITE_API_URL if deployed across origins (e.g. Vercel -> Render)
const apiBase = (import.meta.env.VITE_API_URL || import.meta.env.VITE_BACKEND_URL || '').replace(/\/$/, '');
if (apiBase) {
  const originalFetch = window.fetch;
  window.fetch = function (resource, config) {
    if (typeof resource === 'string' && resource.startsWith('/api')) {
      return originalFetch(`${apiBase}${resource}`, config);
    }
    return originalFetch(resource, config);
  };
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
