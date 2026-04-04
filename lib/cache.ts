import { promises as fs } from "fs"
import { join } from "path"
import { env } from "./env"

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

// Initialize cache directory
async function ensureCacheDir() {
  try {
    await fs.mkdir(CACHE_DIR, { recursive: true })
  } catch (err) {
    console.error("[cache] Failed to create cache directory:", err)
  }
}

// Load cache from disk on first access
let cacheLoaded = false
async function loadCacheFromFile() {
  if (cacheLoaded) return
  cacheLoaded = true

  try {
    const data = await fs.readFile(CACHE_FILE, "utf-8")
    const parsed = JSON.parse(data) as Map<string, CacheEntry<unknown>>
    // Convert object to Map
    for (const [key, value] of Object.entries(parsed)) {
      memoryCache.set(key, value)
    }
  } catch {
    // File doesn't exist yet or is corrupted - start fresh
  }
}

// Save cache to disk (debounced)
let saveTimeout: NodeJS.Timeout | null = null
async function saveCacheToFile() {
  if (saveTimeout) {
    clearTimeout(saveTimeout)
  }

  saveTimeout = setTimeout(async () => {
    try {
      await ensureCacheDir()
      // Convert Map to plain object for JSON serialization
      const obj = Object.fromEntries(memoryCache.entries())
      await fs.writeFile(CACHE_FILE, JSON.stringify(obj), "utf-8")
    } catch (err) {
      console.error("[cache] Failed to save cache:", err)
    }
  }, 100) // Debounce saves by 100ms to avoid excessive disk writes
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

// Clear all cache (useful for testing or manual invalidation)
export async function clearCache(): Promise<void> {
  memoryCache.clear()
  try {
    await fs.unlink(CACHE_FILE)
  } catch {
    // File doesn't exist - that's fine
  }
}
