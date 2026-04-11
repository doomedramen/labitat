import { promises as fs } from "fs"
import { join } from "path"
import { env } from "@/lib/env"

type CacheEntry<T> = {
  data: T
  timestamp: number
}

// In-memory cache for fast access
const memoryCache = new Map<string, CacheEntry<unknown>>()

// File-based cache for persistence
const CACHE_DIR =
  env.CACHE_DIR ??
  (env.NODE_ENV === "production"
    ? "/data/cache"
    : join(process.cwd(), "data", "cache"))
const CACHE_FILE = join(CACHE_DIR, "widget-cache.json")

// Ensure cache directory exists synchronously at startup
try {
  await fs.mkdir(CACHE_DIR, { recursive: true })
} catch (err) {
  console.error("[cache] Failed to create cache directory:", err)
}

// Load cache from disk on first access
let cacheLoadPromise: Promise<void> | null = null

async function loadCacheFromFile() {
  if (cacheLoadPromise) return cacheLoadPromise

  cacheLoadPromise = (async () => {
    try {
      const data = await fs.readFile(CACHE_FILE, "utf-8")
      const parsed = JSON.parse(data) as Record<string, CacheEntry<unknown>>
      for (const [key, value] of Object.entries(parsed)) {
        memoryCache.set(key, value)
      }
    } catch {
      // File doesn't exist yet or is corrupted - start fresh
    }
  })()

  return cacheLoadPromise
}

// Save cache to disk (debounced, with sequential write queue)
let saveTimeout: NodeJS.Timeout | null = null
let writeChain: Promise<void> = Promise.resolve()

function saveCacheToFile() {
  if (saveTimeout) clearTimeout(saveTimeout)

  saveTimeout = setTimeout(() => {
    writeChain = writeChain.then(async () => {
      try {
        const obj = Object.fromEntries(memoryCache.entries())
        await fs.writeFile(CACHE_FILE, JSON.stringify(obj), {
          encoding: "utf-8",
          mode: 0o600,
        })
      } catch (err) {
        console.error("[cache] Failed to save cache:", err)
      }
    })
  }, 100)
}

export async function getCached<T>(
  key: string,
  ttlMs: number
): Promise<T | null> {
  await loadCacheFromFile()

  const entry = memoryCache.get(key)
  if (!entry) return null
  if (Date.now() - entry.timestamp > ttlMs) {
    memoryCache.delete(key)
    saveCacheToFile()
    return null
  }
  return entry.data as T
}

// Get cached data without TTL check - useful for offline fallback.
// If the key is missing from memory, re-reads the file once — this handles
// the case where another module instance (e.g. a seed API route) wrote data
// to disk that this instance hasn't seen yet (Next.js dev mode can give each
// route its own copy of the module).
let reReadAttempted = false

export async function getCachedAny<T>(key: string): Promise<T | null> {
  await loadCacheFromFile()

  const entry = memoryCache.get(key)
  if (entry) {
    reReadAttempted = false
    return entry.data as T
  }

  // Key not in memory — the file may have been updated by another process or
  // a different module instance. Try re-reading once per miss cycle.
  if (!reReadAttempted) {
    reReadAttempted = true
    cacheLoadPromise = null
    await loadCacheFromFile()
    const reloaded = memoryCache.get(key)
    if (reloaded) return reloaded.data as T
  }

  return null
}

// Get both fresh and expired cache in a single lookup
export async function getCachedWithFallback<T>(
  key: string,
  ttlMs: number
): Promise<{ fresh: T | null; expired: T | null }> {
  await loadCacheFromFile()

  const entry = memoryCache.get(key)
  if (!entry) return { fresh: null, expired: null }

  if (Date.now() - entry.timestamp > ttlMs) {
    return { fresh: null, expired: entry.data as T }
  }
  return { fresh: entry.data as T, expired: null }
}

export async function setCached<T>(key: string, data: T): Promise<void> {
  await loadCacheFromFile()

  memoryCache.set(key, { data, timestamp: Date.now() })
  saveCacheToFile()
}

export async function deleteCached(key: string): Promise<void> {
  await loadCacheFromFile()

  memoryCache.delete(key)
  saveCacheToFile()
}

// Flush pending file writes immediately (needed when cache must survive
// across different module instances, e.g. E2E test seed → SSR)
export async function flushCache(): Promise<void> {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  await writeChain
  try {
    const obj = Object.fromEntries(memoryCache.entries())
    await fs.writeFile(CACHE_FILE, JSON.stringify(obj), {
      encoding: "utf-8",
      mode: 0o600,
    })
  } catch (err) {
    console.error("[cache] Failed to flush cache:", err)
  }
}

// Clear all cache
export async function clearCache(): Promise<void> {
  memoryCache.clear()
  try {
    await fs.unlink(CACHE_FILE)
  } catch {
    // File doesn't exist - that's fine
  }
}
