// public/sw.js
const CACHE_NAME = 'atelier-cache-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through semplice per soddisfare i requisiti PWA di installazione
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request)));
});