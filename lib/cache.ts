type CacheEntry<T> = {
  data: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<unknown>>()

export function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > ttlMs) {
    cache.delete(key)
    return null
  }
  return entry.data as T
}

export function setCached<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

export function deleteCached(key: string): void {
  cache.delete(key)
}
