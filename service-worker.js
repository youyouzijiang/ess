// Echoes service worker v4 — login system removed; forces cache refresh on update.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      // After taking control, force-reload every open page so the fresh
      // (no-login) build is served instead of a stale cached one.
      .then(() => self.clients.matchAll({ type: 'window' }))
      .then((clients) => Promise.all(clients.map((c) => {
        try { return c.navigate(c.url); } catch (e) { return Promise.resolve(); }
      }))),
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  // HTML / navigation requests: always go to network, never cached.
  if (event.request.mode === 'navigate') return;

  const url = new URL(event.request.url);

  // Only handle hashed static assets (Vite output: assets/xxx-Ab1Cd2Ef.js/css).
  // Matches both root deployments (/assets/...) and sub-path deployments
  // (e.g. GitHub Pages: /repo/assets/...).
  if (url.pathname.indexOf('/assets/') === -1) return;
  if (!/[-\.][a-zA-Z0-9]{6,12}\.(js|css)(\?|$)/.test(url.pathname)) return;

  event.respondWith(
    caches.open('echoes-assets-v4').then((cache) =>
      cache.match(event.request).then((cached) => {
        if (cached) return cached;
        // cache:"reload" bypasses the HTTP cache so edited files are never stale.
        return fetch(new Request(event.request, { cache: 'reload' })).then((response) => {
          if (response.ok && !(response.headers.get('content-type') || '').includes('text/html')) {
            cache.put(event.request, response.clone());
          }
          return response;
        });
      }),
    ),
  );
});
