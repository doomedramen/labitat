// Labitat Service Worker
// Caching disabled during development - pass through to network

const CACHE_NAME = 'labitat-dev-v1'

// Install event - no caching
self.addEventListener('install', () => {
  self.skipWaiting()
})

// Activate event - clear all caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.map((name) => caches.delete(name)))
    })
  )
  self.clients.claim()
})

// Fetch event - always go to network, no caching
self.addEventListener('fetch', (event) => {
  const { request } = event

  // Only handle same-origin GET requests
  if (new URL(request.url).origin !== location.origin || request.method !== 'GET') {
    return
  }

  event.respondWith(fetch(request))
})
