/* Monkey Radio India - service worker.
 *
 * Goal: the app *shell* (HTML, the React runtime, the compiled app bundle,
 * the logo, the UI font) loads offline, so opening the installed app on a
 * dead connection shows the interface instead of the browser's dinosaur.
 * Audio and the archive index still need the network - anything on
 * *.mixcloud.com is always fetched live and never cached.
 *
 * The app ships as a precompiled bundle (assets/app.js, built from
 * src/app.jsx by scripts/build-app.mjs) rather than shipping a JSX
 * compiler to the browser - see index.html.
 *
 * Bump CACHE whenever the precache list or this file changes.
 */
const CACHE = 'mri-shell-v17';

// Same-origin shell + the pinned, immutable third-party runtime the page
// cannot boot without. All CORS-clean, so addAll() is safe.
const PRECACHE = [
  '/',
  '/index.html',
  '/assets/app.js',
  '/assets/shader-bg.js',
  '/manifest.webmanifest',
  '/assets/logo.png',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  'https://cdnjs.cloudflare.com/ajax/libs/react/18.3.1/umd/react.production.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/react-dom/18.3.1/umd/react-dom.production.min.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
      .catch(() => {})
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting();
});

function isFontAsset(url) {
  return url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never touch Mixcloud (archive API, player widget, audio) or any other
  // host - let the network handle it, uncached.
  const sameOrigin = url.origin === self.location.origin;
  const isRuntimeCdn = url.hostname === 'cdnjs.cloudflare.com';
  const isFont = isFontAsset(url);
  if (!sameOrigin && !isRuntimeCdn && !isFont) return;

  // App navigations: network-first so an online visitor always gets the
  // latest HTML (every client-side route - /archive, /show/<slug>, … - is
  // the same index.html). Only when the network fails do we fall back to
  // the cached shell, then the bare offline page.
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      try {
        const res = await fetch(req);
        if (res && res.ok) cache.put('/index.html', res.clone());
        return res;
      } catch (e) {
        return (await cache.match('/index.html', { ignoreSearch: true }))
          || (await cache.match('/', { ignoreSearch: true }))
          || new Response(
            '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font:16px/1.5 system-ui;margin:0;padding:2rem;background:#f3f2f2;color:#201e1d">Offline. Reconnect to load Monkey Radio India.',
            { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
          );
      }
    })());
    return;
  }

  // Pinned runtime + fonts: cache-first (immutable / rarely changing).
  if (isRuntimeCdn || isFont) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => hit))
    );
    return;
  }

  // Same-origin assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((hit) => {
      const net = fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
