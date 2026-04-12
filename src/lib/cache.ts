import { env } from "@/lib/env"

type CacheEntry<T> = {
  data: T
  timestamp: number
}

// Pure in-memory cache — no file I/O to avoid blocking SSR responses
const memoryCache = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > ttlMs) {
    memoryCache.delete(key)
    return null
  }
  return entry.data as T
}

// Get cached data without TTL check - useful for offline fallback.
export function getCachedAny<T>(key: string): T | null {
  const entry = memoryCache.get(key)
  if (entry) return entry.data as T
  return null
}

// Get both fresh and expired cache in a single lookup
export function getCachedWithFallback<T>(
  key: string,
  ttlMs: number
): { fresh: T | null; expired: T | null } {
  const entry = memoryCache.get(key)
  if (!entry) return { fresh: null, expired: null }

  if (Date.now() - entry.timestamp > ttlMs) {
    return { fresh: null, expired: entry.data as T }
  }
  return { fresh: entry.data as T, expired: null }
}

export function setCached<T>(key: string, data: T): void {
  memoryCache.set(key, { data, timestamp: Date.now() })
}

export function deleteCached(key: string): void {
  memoryCache.delete(key)
}

// Clear all cache
export function clearCache(): void {
  memoryCache.clear()
}
