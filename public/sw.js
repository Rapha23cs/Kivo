const CACHE_VERSION = '__KIVO_CACHE_VERSION__';
const PRECACHE_ASSETS = /* __KIVO_PRECACHE__ */ [];

function isCacheableResponse(pathname, response) {
  if (!response || !response.ok) return false;
  const contentType = (response.headers.get('content-type') || '').toLowerCase();
  if (pathname.startsWith('/assets/')) {
    if (contentType.includes('text/html')) return false;
    if (pathname.endsWith('.js') && !contentType.includes('javascript') && !contentType.includes('ecmascript')) {
      return false;
    }
    if (pathname.endsWith('.css') && !contentType.includes('text/css')) {
      return false;
    }
  }
  return true;
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then(async (cache) => {
      const core = ['/index.html', '/manifest.webmanifest', '/icon.svg', ...PRECACHE_ASSETS];
      await Promise.allSettled(
        core.map((url) =>
          fetch(new Request(url, { cache: 'no-store' }))
            .then((res) => {
              if (isCacheableResponse(url, res)) {
                return cache.put(url, res);
              }
              return null;
            })
            .catch(() => null)
        )
      );
    })
  );
});

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith('kivo-shell-') && key !== CACHE_VERSION)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname === '/sw.js') return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request, { cache: 'no-store' })
        .then((response) => {
          const contentType = (response.headers.get('content-type') || '').toLowerCase();
          if (response && response.ok && contentType.includes('text/html')) {
            const copy = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put('/index.html', copy));
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match('/index.html');
          return cached || caches.match('/');
        })
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        if (isCacheableResponse(url.pathname, cached)) {
          return cached;
        }
        caches.open(CACHE_VERSION).then((cache) => cache.delete(request));
      }
      return fetch(request).then((response) => {
        if (isCacheableResponse(url.pathname, response)) {
          const copy = response.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(request, copy));
        }
        return response;
      });
    })
  );
});
