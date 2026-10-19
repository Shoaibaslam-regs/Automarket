/*
 * AutoMarket service worker. Registered in production by components/pwa/PwaRegister.tsx.
 *
 * What it caches (GET requests to this site only):
 *  - /_next/static/*: build files with hashed names, cache-first (they never change)
 *  - images (/_next/image, /icons, public images): stale-while-revalidate, capped at 120 entries
 *  - the /offline page, shown when a page can't load without a connection
 * It never caches pages or API responses, so signed-in pages (messages, bookings, the console, admin)
 * always come fresh from the server and nothing personal is stored on the phone.
 * Bump VERSION when this file changes to clear the old caches.
 */
const VERSION = "v1";
const STATIC = `am-static-${VERSION}`;
const IMAGES = `am-images-${VERSION}`;
const OFFLINE_URL = "/offline";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];
const MAX_IMAGES = 120;

self.addEventListener("install", event => {
  event.waitUntil(caches.open(STATIC).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith("am-") && k !== STATIC && k !== IMAGES).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Pages: always from the network; the offline page when there's no connection
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error()));
    return;
  }

  // Build files: hashed names, safe to keep
  if (url.pathname.startsWith("/_next/static/")) {
    event.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC).then(c => c.put(req, copy)); }
        return res;
      }))
    );
    return;
  }

  // Images: show the saved copy straight away and refresh it in the background
  const isImage = url.pathname.startsWith("/_next/image") || url.pathname.startsWith("/icons/") || /\.(png|jpe?g|webp|avif|svg|gif)$/i.test(url.pathname);
  if (isImage) {
    event.respondWith(
      caches.open(IMAGES).then(async cache => {
        const hit = await cache.match(req);
        const fresh = fetch(req).then(res => {
          if (res.ok) { cache.put(req, res.clone()); trim(IMAGES, MAX_IMAGES); }
          return res;
        }).catch(() => hit);
        return hit || fresh;
      })
    );
  }
  // Everything else (API calls, data) goes straight to the network
});
