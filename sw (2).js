// TinaSelect Service Worker v2 — Modern Android compatible
const CACHE_NAME = 'tinaselect-v3';

// Only cache the core page — nothing that could raise privacy flags
const CORE_ASSETS = [
  '/tinaselect.store/',
  '/tinaselect.store/index.html',
  '/tinaselect.store/manifest.json',
  '/tinaselect.store/icon-192.png',
  '/tinaselect.store/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(CORE_ASSETS))
      .catch(() => {}) // fail silently if offline at install
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  // Remove old caches
  event.waitUntil(
    caches.keys().then(cacheNames =>
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept: payments, APIs, external auth
  if (
    event.request.method !== 'GET' ||
    url.hostname.includes('paystack') ||
    url.hostname.includes('api.github.com') ||
    url.hostname.includes('api.jsonbin.io') ||
    url.hostname.includes('googletagmanager') ||
    url.hostname.includes('google-analytics')
  ) return;

  // Network first for products.json (always get latest)
  if (url.pathname.includes('products.json')) {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
          return res;
        })
        .catch(() => caches.match(event.request))
    );
    return;
  }

  // Cache first for everything else (fonts, icons, the HTML itself)
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      return fetch(event.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
