import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './index.css';

if ('serviceWorker' in navigator) {
  // 1. Disregistra i vecchi Service Worker
  navigator.serviceWorker.getRegistrations()
    .then((registrations) => Promise.all(
      registrations
        .filter((registration) => {
          const workers = [registration.active, registration.waiting, registration.installing];
          return workers.some((worker) => {
            if (!worker) return false;
            const scriptUrl = new URL(worker.scriptURL);
            return scriptUrl.origin === window.location.origin && scriptUrl.pathname.endsWith('/sw.js');
          });
        })
        .map((registration) => registration.unregister())
    ))
    .catch(() => {});

  // 2. Svuota la cache locale memorizzata dal Service Worker (opzionale ma consigliato per reset totale)
  if ('caches' in window) {
    caches.keys().then((names) => {
      names.forEach((name) => caches.delete(name));
    }).catch(() => {});
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);