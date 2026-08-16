// Service Worker — Gradiška Events (PWA)
// Siguran pristup: API pozivi, auth i admin stranice NIKAD se ne keširaju.
// Keširaju se samo statički resursi (ikone, slike, _next/static) za brže učitavanje.

const CACHE_NAME = 'gdjeveceras-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);

  // Samo naš origin
  if (url.origin !== self.location.origin) return;

  // Samo GET
  if (request.method !== 'GET') return;

  // API, auth, admin — uvijek svježe sa mreže
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;

  // Statika — cache-first
  const isStatic =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.startsWith('/events/') ||
    url.pathname.startsWith('/bg-') ||
    url.pathname.startsWith('/hero') ||
    /\.(png|jpe?g|svg|ico|webp|woff2?)$/.test(url.pathname);

  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE_NAME).then((c) => c.put(request, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // Navigacije — network-first, offline fallback na keš
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, copy));
          return res;
        })
        .catch(() => caches.match(request).then((r) => r || caches.match('/')))
    );
  }
});
