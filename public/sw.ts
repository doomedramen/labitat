// Labitat Service Worker
// Balanced caching strategy for offline support without stale content issues

// Version is injected at build time via esbuild define
declare const SW_VERSION: string

const CACHE_VERSION = SW_VERSION
const STATIC_CACHE = `labitat-static-${CACHE_VERSION}`
const DYNAMIC_CACHE = `labitat-dynamic-${CACHE_VERSION}`
const OFFLINE_PAGE = "/offline.html"

// Assets to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/manifest.ts",
  "/offline.html",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
]

// Install event - cache static assets
self.addEventListener("install", (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        return cache.addAll(STATIC_ASSETS).catch(() => {
          // Some assets might not exist yet, that's ok
        })
      })
      .then(() => self.skipWaiting())
  )
})

// Activate event - clean old caches
self.addEventListener("activate", (event: ExtendableEvent) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter(
              (name) =>
                name.startsWith("labitat-") &&
                name !== STATIC_CACHE &&
                name !== DYNAMIC_CACHE
            )
            .map((name) => {
              return caches.delete(name)
            })
        )
      })
      .then(() => self.clients.claim())
  )
})

// Fetch event - balanced caching strategy
self.addEventListener("fetch", (event: FetchEvent) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin GET requests
  if (url.origin !== location.origin || request.method !== "GET") {
    return
  }

  // Skip non-http(s) protocols
  if (!url.protocol.startsWith("http")) {
    return
  }

  // Skip Next.js server actions and API routes (POST requests with query params)
  // These should never be cached as they contain dynamic data
  if (
    url.pathname.includes("_next/data") ||
    url.searchParams.has("action") ||
    url.searchParams.has("action_id")
  ) {
    return
  }

  event.respondWith(handleRequest(request))
})

async function handleRequest(request: Request) {
  const url = new URL(request.url)

  // Strategy 1: Static assets (JS, CSS, fonts, icons) - Cache First with network fallback
  if (isStaticAsset(url)) {
    return cacheFirst(request, STATIC_CACHE)
  }

  // Strategy 2: HTML pages - Network First with cache fallback (fresh content priority)
  if (isNavigationRequest(request)) {
    return networkFirst(request, DYNAMIC_CACHE, true)
  }

  // Strategy 3: API calls and other resources - Stale-While-Revalidate with error handling
  return staleWhileRevalidate(request, DYNAMIC_CACHE)
}

function isStaticAsset(url: URL) {
  const staticExtensions = [
    ".js",
    ".css",
    ".png",
    ".jpg",
    ".jpeg",
    ".gif",
    ".svg",
    ".woff",
    ".woff2",
    ".ttf",
    ".eot",
  ]
  const isIcon = url.pathname.startsWith("/icons/")
  const hasStaticExt = staticExtensions.some((ext) =>
    url.pathname.endsWith(ext)
  )
  return isIcon || hasStaticExt
}

function isNavigationRequest(request: Request) {
  return request.headers.get("accept")?.includes("text/html") ?? false
}

// Cache-First Strategy: Fast for static assets that rarely change
async function cacheFirst(request: Request, cacheName: string) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  if (cached) {
    // Return cached version immediately
    // Optionally update in background
    fetch(request)
      .then((response) => {
        if (response.ok) {
          cache.put(request, response.clone())
        }
      })
      .catch(() => {
        // Network failed, but we have cache - no problem
      })
    return cached
  }

  // Not in cache, fetch from network
  try {
    const response = await fetch(request)
    if (response.ok) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Offline and not in cache
    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
    })
  }
}

// Network-First Strategy: Fresh content with offline fallback
async function networkFirst(
  request: Request,
  cacheName: string,
  useOfflinePage = false
) {
  const cache = await caches.open(cacheName)

  try {
    // Try network first
    const response = await fetch(request)
    if (response.ok) {
      // Update cache with fresh version
      cache.put(request, response.clone())
    }
    return response
  } catch {
    // Network failed, try cache
    const cached = await cache.match(request)
    if (cached) {
      return cached
    }

    // Offline and not in cache - return offline page for navigation requests
    if (useOfflinePage) {
      const offlinePage = await cache.match(OFFLINE_PAGE)
      if (offlinePage) {
        return offlinePage
      }
    }

    return new Response("Offline", {
      status: 503,
      statusText: "Service Unavailable",
    })
  }
}

// Stale-While-Revalidate Strategy: Return cached version immediately, update in background
// Best for API calls - shows old data while fetching new data
async function staleWhileRevalidate(request: Request, cacheName: string) {
  const cache = await caches.open(cacheName)
  const cached = await cache.match(request)

  // Start network request in background
  const networkPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone())
      }
      return response
    })
    .catch(() => {
      // Network failed - we'll return cached or error
      return null
    })

  // If we have cached data, return it immediately and update in background
  if (cached) {
    // Return cached version, but update cache for next time
    networkPromise.catch(() => {
      // Ignore errors - we already have cache
    })
    return cached
  }

  // No cache, wait for network
  const response = await networkPromise
  if (response) {
    return response
  }

  // Both cache and network failed
  return new Response(JSON.stringify({ error: "Offline" }), {
    status: 503,
    statusText: "Service Unavailable",
    headers: { "Content-Type": "application/json" },
  })
}
