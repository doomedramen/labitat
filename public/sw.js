/**
 * Labitat Service Worker
 * Raw Cache API implementation — no Serwist/Workbox dependency.
 *
 * Strategies:
 * - Precache: static assets (JS, CSS, icons)
 * - Network only: live and health APIs
 * - NetworkFirst: icon APIs and data files
 * - CacheFirst: static images, fonts
 * - Network only: HTML, RSC, and all other application data
 */

const CACHE_NAME = "labitat-v4";
const SW_VERSION = CACHE_NAME;
const PRECACHE_URLS = ["/~offline", "/manifest.webmanifest"];

// ── Install: precache static assets ──────────────────────────────────────────

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)));
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

// ── Message: handle SKIP_WAITING from the registrar ──────────────────────────

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
  if (event.data?.type === "GET_VERSION" && event.ports?.[0]) {
    event.ports[0].postMessage({ version: SW_VERSION });
  }
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

  // Live streams and health checks must reach the network. Cache API ignores
  // Cache-Control, and replaying an old event stream falsely looks connected.
  if (url.pathname.startsWith("/api/")) {
    if (url.pathname === "/api/icon" || url.pathname === "/api/icons") {
      event.respondWith(networkFirst(request));
    }
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

  // HTML, RSC payloads, manifests, and application data always use the network.
  // Cache API ignores Cache-Control and Vary; a cached RSC response can undo
  // a successful configuration save or replay a different authentication state.
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
