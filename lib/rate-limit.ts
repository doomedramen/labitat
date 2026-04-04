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

// Save to disk (sync, called infrequently)
function saveLimits() {
  try {
    const dir = path.dirname(RATE_LIMIT_FILE)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    const obj = Object.fromEntries(limits.entries())
    fs.writeFileSync(RATE_LIMIT_FILE, JSON.stringify(obj), "utf-8")
  } catch {
    // Ignore save errors
  }
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
    saveLimits()
    return { allowed: true }
  }

  // Still within window
  if (entry.count >= MAX_ATTEMPTS) {
    entry.lockedUntil = Date.now() + LOCKOUT_MS
    saveLimits()
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
    // Reset window if expired
    if (Date.now() - entry.firstAttempt > WINDOW_MS) {
      entry.count = 1
      entry.firstAttempt = Date.now()
      entry.lockedUntil = undefined
    } else {
      entry.count++
    }
  }

  saveLimits()
}

/**
 * Reset rate limit for a key (e.g., after successful login).
 */
export function resetRateLimit(key: string) {
  limits.delete(key)
  saveLimits()
}

/**
 * Clear all rate limits (useful for testing).
 */
export function clearRateLimits() {
  limits.clear()
  try {
    fs.unlinkSync(RATE_LIMIT_FILE)
  } catch {
    // File doesn't exist
  }
}
