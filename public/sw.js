/* Green Owl Labs · service worker
   Estrategia: shell precacheado, navegación network-first con caída al índice,
   activos con hash cache-first y actualización en segundo plano.
   Todas las rutas se resuelven contra el scope para funcionar igual en la raíz
   y en un subdirectorio (GitHub Pages). */

const VERSION = 'gol-v1.0.0-r3';
const SCOPE = self.registration.scope;
const scoped = (path) => new URL(path, SCOPE).href;

const SHELL = [
  '',
  'index.html',
  'manifest.webmanifest',
  'brand-emblem.webp',
  'icon-64.png',
  'icon-180.png',
  'icon-192.png',
  'icon-512.png',
].map(scoped);

const INDEX = scoped('index.html');
const ROOT = scoped('');

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(VERSION).then((cache) => cache.put(INDEX, copy)).catch(() => {});
          return response;
        })
        .catch(async () => (await caches.match(INDEX)) || (await caches.match(ROOT)) || Response.error()),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(VERSION).then((cache) => cache.put(request, copy)).catch(() => {});
          }
          return response;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
