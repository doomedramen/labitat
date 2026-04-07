import fs from "fs"
import path from "path"

const RATE_LIMIT_FILE = path.join(process.cwd(), "data", "rate-limits.json")

type RateLimitEntry = {
  count: number
  firstAttempt: number
  lockedUntil?: number
}

// In-memory store
const limits = new Map<string, RateLimitEntry>()

// Debounced save state
let saveTimeout: NodeJS.Timeout | null = null
const SAVE_DEBOUNCE_MS = 5000 // Batch writes every 5 seconds
let dirty = false // Track if we have unsaved changes

// Load from disk on startup
function loadLimits() {
  try {
    const data = fs.readFileSync(RATE_LIMIT_FILE, "utf-8")
    const parsed = JSON.parse(data) as Record<string, RateLimitEntry>
    for (const [key, value] of Object.entries(parsed)) {
      limits.set(key, value)
    }
  } catch {
    // File doesn't exist yet - start fresh
  }
}

/**
 * Schedule a debounced save to disk.
 * Multiple rapid calls will be batched into a single write.
 */
function scheduleSave() {
  dirty = true

  if (saveTimeout !== null) {
    return // Already scheduled
  }

  saveTimeout = setTimeout(() => {
    saveLimits()
    saveTimeout = null
  }, SAVE_DEBOUNCE_MS)
}

// Save to disk (called debounced)
function saveLimits() {
  if (!dirty) return

  try {
    const dir = path.dirname(RATE_LIMIT_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const obj = Object.fromEntries(limits.entries())
    fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(obj), "utf-8")
    dirty = false
  } catch {
    // Ignore save errors
  }
}

/**
 * Force immediate save (e.g., before process exit).
 */
export function flushRateLimits() {
  if (saveTimeout !== null) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  saveLimits()
}

// Register graceful shutdown to flush pending writes
if (typeof process !== "undefined") {
  process.on("SIGTERM", () => {
    flushRateLimits()
  })
  process.on("SIGINT", () => {
    flushRateLimits()
  })
}

loadLimits()

const MAX_ATTEMPTS = 5
const WINDOW_MS = 15 * 60 * 1000 // 15 minutes
const LOCKOUT_MS = 30 * 60 * 1000 // 30 minutes

/**
 * Check if a key (IP or account) is rate limited.
 * Returns { allowed: false, retryAfterMs } if limited.
 */
export function checkRateLimit(key: string): {
  allowed: boolean
  retryAfterMs?: number
} {
  const entry = limits.get(key)

  if (!entry) {
    return { allowed: true }
  }

  // Check if locked out
  if (entry.lockedUntil && Date.now() < entry.lockedUntil) {
    return {
      allowed: false,
      retryAfterMs: entry.lockedUntil - Date.now(),
    }
  }

  // Check if window has expired
  if (Date.now() - entry.firstAttempt > WINDOW_MS) {
    limits.delete(key)
    scheduleSave()
    return { allowed: true }
  }

  // Still within window
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS
    scheduleSave()
    return {
      allowed: false,
      retryAfterMs: LOCKOUT_MS,
    }
  }

  return { allowed: true }
}

/**
 * Record a failed attempt for a key.
 */
export function recordFailedAttempt(key: string) {
  const entry = limits.get(key)

  if (!entry) {
    limits.set(key, {
      count: 1,
      firstAttempt: Date.now(),
    })
  } else {
    // Reset window if expired, but preserve an active lock
    if (Date.now() - entry.firstAttempt > WINDOW_MS) {
      entry.count = 1
      entry.firstAttempt = Date.now()
      if (!entry.lockedUntil || Date.now() >= entry.lockedUntil) {
        entry.lockedUntil = undefined
      }
    } else {
      entry.count++
    }
  }

  scheduleSave()
}

/**
 * Reset rate limit for a key (e.g., after successful login).
 */
export function resetRateLimit(key: string) {
  limits.delete(key)
  scheduleSave()
}

/**
 * Clear all rate limits (useful for testing).
 */
export function clearRateLimits() {
  limits.clear()
  dirty = false
  if (saveTimeout !== null) {
    clearTimeout(saveTimeout)
    saveTimeout = null
  }
  try {
    fs.unlinkSync(RATE_LIMIT_FILE)
  } catch {
    // File doesn't exist
  }
}
