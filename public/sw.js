// Retire the previously public offline shell. Private content is never cached.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  await Promise.all(keys.filter(key => key.startsWith('vagasmz-cache-')).map(key => caches.delete(key)));
  await self.clients.claim();
  await self.registration.unregister();
  const clients = await self.clients.matchAll({type:'window'});
  await Promise.all(clients.map(client => client.navigate('/login').catch(() => {})));
})()));
