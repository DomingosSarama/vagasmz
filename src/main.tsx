import { AppErrorBoundary } from './components/AppErrorBoundary.tsx';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Purge legacy cache-first service worker caches so updates appear immediately
if (typeof window !== 'undefined' && 'caches' in window) {
  caches
    .keys()
    .then((keys) => {
      keys.forEach((key) => {
        if (key.startsWith('vagasmz-cache-') && key !== 'vagasmz-cache-v3-swiss') {
          caches.delete(key);
        }
      });
    })
    .catch(() => {});
}

if (import.meta.env.PROD && 'serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => {
        reg.update().catch(() => {});
      })
      .catch(() => {
        // Graceful offline fallback if blocked by sandbox
      });
  });
}

createRoot(document.getElementById('root')!).render(<AppErrorBoundary><App /></AppErrorBoundary>);
