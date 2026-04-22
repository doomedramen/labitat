/**
 * Labitat Service Worker
 * Raw Cache API implementation — no Serwist/Workbox dependency.
 *
 * Strategies:
 * - Precache: static assets (JS, CSS, icons)
 * - NetworkFirst: API routes, data files
 * - CacheFirst: static images, fonts
 * - StaleWhileRevalidate: everything else
 */

const CACHE_NAME = "labitat-v2";
const PRECACHE_URLS = ["/", "/~offline", "/manifest.webmanifest"];

// ── Install: precache static assets ──────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
  self.skipWaiting();
});

// ── Activate: clean up old caches ────────────────────────────────────────────

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))),
      ),
  );
  self.clients.claim();
});

// ── Fetch: routing by strategy ───────────────────────────────────────────────

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only cache GET requests over http(s)
  if (request.method !== "GET" || !url.protocol.startsWith("http")) {
    return;
  }

  // Navigation requests → Network only (no caching to prevent stale data flash)
  // Falls back to cached version or offline page only when actually offline
  if (request.mode === "navigate") {
    event.respondWith(networkOnlyWithOfflineFallback(request, "/~offline"));
    return;
  }

  // API routes → NetworkFirst
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Selfhst icons from CDN → CacheFirst (must come before generic image check)
  if (url.hostname === "cdn.jsdelivr.net" && url.pathname.startsWith("/gh/selfhst/icons")) {
    event.respondWith(cacheFirst(request, "icon-cache"));
    return;
  }

  // Static JS/CSS (immutable filenames) → CacheFirst
  // Exclude the service worker itself from caching
  if (/\.(?:js|css)$/i.test(url.pathname) && !url.pathname.endsWith("/sw.js")) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Images → CacheFirst
  if (/\.(?:jpg|jpeg|gif|png|svg|ico|webp)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Fonts → CacheFirst
  if (/\.(?:eot|otf|ttc|ttf|woff|woff2)$/i.test(url.pathname)) {
    event.respondWith(cacheFirst(request, "font-cache"));
    return;
  }

  // Cross-origin requests → NetworkFirst
  if (url.origin !== self.location.origin) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else → StaleWhileRevalidate
  event.respondWith(staleWhileRevalidate(request));
});

// ── Strategies ───────────────────────────────────────────────────────────────

async function cacheFirst(request, cacheName) {
  const name = cacheName || CACHE_NAME;
  const cache = await caches.open(name);
  const cached = await cache.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    // Cache successful responses and opaque responses (cross-origin no-cors)
    // Opaque responses have status 0 / ok:false, but are valid for <img> etc.
    if (response.ok || response.type === "opaque") {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("", { status: 408, statusText: "Request failed" });
  }
}

async function networkFirst(request, fallbackUrl) {
  try {
    const response = await fetch(request);
    if (response.ok || response.type === "opaque") {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function networkOnlyWithOfflineFallback(request, fallbackUrl) {
  try {
    // Always try network first - don't cache successful responses
    return await fetch(request);
  } catch {
    // Network failed - try cached version or offline fallback
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(request);
    if (cached) return cached;
    if (fallbackUrl) {
      const fallback = await cache.match(fallbackUrl);
      if (fallback) return fallback;
    }
    return new Response("Offline", {
      status: 503,
      headers: { "Content-Type": "text/plain" },
    });
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok || response.type === "opaque") {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || fetchPromise;
}
