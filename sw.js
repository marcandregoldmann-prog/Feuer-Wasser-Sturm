const CACHE_NAME = 'fws-cache-v3';
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      // Cache each asset individually so one failure doesn't break everything
      Promise.allSettled(
        ASSETS.map(url => cache.add(url).catch(err => console.warn('Cache skip:', url, err)))
      )
    )
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const request = event.request;

  // Only handle same-origin GET requests
  if (request.method !== 'GET') return;

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;

      // For navigation requests, try to serve index.html from cache
      if (request.mode === 'navigate') {
        return caches.match('./index.html').then(index => index || fetch(request));
      }

      return fetch(request).then(response => {
        // Cache successful responses for future offline use
        if (response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        }
        return response;
      });
    }).catch(() => {
      // Offline fallback for navigation
      if (request.mode === 'navigate') {
        return caches.match('./index.html');
      }
    })
  );
});
