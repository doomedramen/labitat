// Service worker global declarations
declare const SW_VERSION: string

// Extend ServiceWorkerGlobalScope with proper types
interface ServiceWorkerGlobalScope {
  caches: CacheStorage
}
