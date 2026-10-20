const CACHE_NAME = 'vagasmz-cache-v3-swiss';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      const hadStaleCache = keys.some((key) => key.startsWith('vagasmz-cache-') && key !== CACHE_NAME);
      await Promise.all(
        keys.map((key) => {
          if (key.startsWith('vagasmz-cache-') && key !== CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve(false);
        })
      );
      await self.clients.claim();
      if (hadStaleCache) {
        const windowClients = await self.clients.matchAll({ type: 'window' });
        for (const client of windowClients) {
          try {
            await client.navigate(client.url);
          } catch {
            // Ignore navigation errors on cross-origin or closing tabs
          }
        }
      }
    })()
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);

  // Never cache API routes, Vite modules, or source files
  if (
    url.pathname.startsWith('/api/') ||
    url.pathname.startsWith('/@') ||
    url.pathname.startsWith('/src/') ||
    url.pathname.includes('node_modules')
  ) {
    return;
  }

  // Network-first strategy: always fetch fresh content when online, fallback to cache only offline
  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (
          networkResponse &&
          networkResponse.status === 200 &&
          networkResponse.type === 'basic'
        ) {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() =>
        caches.match(event.request).then(async (cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          if (event.request.headers.get('accept')?.includes('text/html')) {
            return (await caches.match('/index.html')) || (await caches.match('/')) || new Response('Offline', { status: 503 });
          }
          return new Response('Offline', { status: 503 });
        })
      )
  );
});
