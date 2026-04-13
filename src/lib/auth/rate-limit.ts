// ── Rate Limiter ──────────────────────────────────────────────────────────────
// In-memory rate limiter for auth endpoints.
// Tracks failed attempts per key (IP or email) with sliding window.

interface RateLimitEntry {
  attempts: number;
  firstAttempt: number;
  lastAttempt: number;
}

const store = new Map<string, RateLimitEntry>();

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes lockout

export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
  remaining: number;
}

/** Check if a key is rate limited */
export function checkRateLimit(key: string): RateLimitResult {
  const entry = store.get(key);
  const now = Date.now();

  if (!entry) {
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  // Reset if window has expired
  if (now - entry.firstAttempt > WINDOW_MS + LOCKOUT_MS) {
    store.delete(key);
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  // Check if still in lockout period
  if (entry.attempts >= MAX_ATTEMPTS) {
    const retryAfter = entry.lastAttempt + LOCKOUT_MS - now;
    if (retryAfter > 0) {
      return { allowed: false, retryAfterMs: retryAfter, remaining: 0 };
    }
    // Lockout expired, reset
    store.delete(key);
    return { allowed: true, remaining: MAX_ATTEMPTS };
  }

  return { allowed: true, remaining: MAX_ATTEMPTS - entry.attempts };
}

/** Record a failed attempt */
export function recordFailedAttempt(key: string): void {
  const now = Date.now();

  // Periodically clean up expired entries (every 100 failed attempts)
  if (store.size > 0 && store.size % 100 === 0) {
    cleanupExpiredEntries();
  }

  const entry = store.get(key);

  if (!entry) {
    store.set(key, { attempts: 1, firstAttempt: now, lastAttempt: now });
    return;
  }

  // Reset if window expired
  if (now - entry.firstAttempt > WINDOW_MS + LOCKOUT_MS) {
    store.set(key, { attempts: 1, firstAttempt: now, lastAttempt: now });
    return;
  }

  entry.attempts++;
  entry.lastAttempt = now;
}

/** Reset rate limit for a key (e.g., after successful login) */
export function resetRateLimit(key: string): void {
  store.delete(key);
}

/** Clean up expired entries (call periodically or on demand) */
export function cleanupExpiredEntries(): void {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (now - entry.firstAttempt > WINDOW_MS + LOCKOUT_MS) {
      store.delete(key);
    }
  }
}

/** Reset all rate limit entries (test use only) */
export function resetAllRateLimits(): void {
  store.clear();
}
