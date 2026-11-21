// Self-destructing service worker to automatically clear legacy cached apps on this domain.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: 'window' });
        for (const client of clients) {
          if ('navigate' in client && client.url) {
            client.navigate(client.url);
          }
        }
      } catch {
        // Ignore cleanup errors on restricted environments
      }
    })()
  );
});
