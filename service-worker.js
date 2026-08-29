/* ============================================================
   SHELF SYNC - service-worker.js

   WHY THIS FILE CHANGED
   The old version cached app.js under a name that never changed and served
   the cached copy FIRST. Once that cache filled up, every edit you made to
   app.js was ignored and your phone kept running the old code. That is what
   made it feel like the whole app broke.

   This version goes to the network first and only falls back to the cache
   when you are offline, so your edits always show up.

   ONE RULE: bump CACHE_VERSION whenever you change app.js or index.html.
   ============================================================ */

const CACHE_VERSION = 'shelf-sync-v3';
const CORE_ASSETS = [
  './',
  './index.html',
  './app.js',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

/* Pre-cache the app shell so it still opens with no signal. */
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(CORE_ASSETS))
      .catch(() => { /* a missing optional file must not block install */ })
  );
  self.skipWaiting();
});

/* Delete every older cache so nothing stale can survive a release. */
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

/* Network first, cache as the offline fallback. */
self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => { });
        return res;
      })
      .catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html')))
  );
});
