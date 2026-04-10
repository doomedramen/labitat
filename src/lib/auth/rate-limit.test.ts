import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  checkRateLimit,
  recordFailedAttempt,
  resetRateLimit,
  cleanupExpiredEntries,
  resetAllRateLimits,
} from "@/lib/auth/rate-limit"

describe("rate-limit", () => {
  beforeEach(() => {
    resetAllRateLimits()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("checkRateLimit", () => {
    it("allows request for unknown key", () => {
      const result = checkRateLimit("ip:1.2.3.4")
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5)
      expect(result.retryAfterMs).toBeUndefined()
    })

    it("decrements remaining after failed attempts", () => {
      recordFailedAttempt("ip:1.2.3.4")
      const result = checkRateLimit("ip:1.2.3.4")
      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(4)
    })

    it("blocks after 5 failed attempts", () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt("ip:1.2.3.4")
      }
      const result = checkRateLimit("ip:1.2.3.4")
      expect(result.allowed).toBe(false)
      expect(result.remaining).toBe(0)
      expect(result.retryAfterMs).toBeGreaterThan(0)
    })

    it("reports retryAfterMs in lockout period", () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt("ip:1.2.3.4")
      }

      // Advance 5 minutes into the lockout
      vi.advanceTimersByTime(5 * 60 * 1000)
      const result = checkRateLimit("ip:1.2.3.4")

      expect(result.allowed).toBe(false)
      // Lockout is 15 minutes, 5 have elapsed, so ~10 minutes remaining
      expect(result.retryAfterMs).toBeGreaterThan(9 * 60 * 1000)
      expect(result.retryAfterMs).toBeLessThanOrEqual(10 * 60 * 1000)
    })

    it("allows again after lockout expires", () => {
      for (let i = 0; i < 5; i++) {
        recordFailedAttempt("ip:1.2.3.4")
      }

      // Advance past the full window + lockout (30 minutes total)
      vi.advanceTimersByTime(31 * 60 * 1000)
      const result = checkRateLimit("ip:1.2.3.4")

      expect(result.allowed).toBe(true)
      expect(result.remaining).toBe(5)
    })
  })

  describe("recordFailedAttempt", () => {
    it("creates a new entry for unknown key", () => {
      recordFailedAttempt("email:test@example.com")
      const result = checkRateLimit("email:test@example.com")
      expect(result.remaining).toBe(4)
    })

    it("increments attempts for existing key", () => {
      recordFailedAttempt("email:test@example.com")
      recordFailedAttempt("email:test@example.com")
      recordFailedAttempt("email:test@example.com")
      const result = checkRateLimit("email:test@example.com")
      expect(result.remaining).toBe(2)
    })

    it("resets entry if window has fully expired", () => {
      recordFailedAttempt("email:test@example.com")

      // Advance past window + lockout
      vi.advanceTimersByTime(31 * 60 * 1000)
      recordFailedAttempt("email:test@example.com")

      const result = checkRateLimit("email:test@example.com")
      expect(result.remaining).toBe(4) // Fresh entry with 1 attempt
    })

    it("tracks different keys independently", () => {
      recordFailedAttempt("ip:1.1.1.1")
      recordFailedAttempt("ip:1.1.1.1")
      recordFailedAttempt("ip:2.2.2.2")

      expect(checkRateLimit("ip:1.1.1.1").remaining).toBe(3)
      expect(checkRateLimit("ip:2.2.2.2").remaining).toBe(4)
      expect(checkRateLimit("ip:3.3.3.3").remaining).toBe(5)
    })
  })

  describe("resetRateLimit", () => {
    it("clears rate limit for a key", () => {
      for (let i = 0; i < 4; i++) {
        recordFailedAttempt("ip:1.2.3.4")
      }
      expect(checkRateLimit("ip:1.2.3.4").remaining).toBe(1)

      resetRateLimit("ip:1.2.3.4")
      expect(checkRateLimit("ip:1.2.3.4").remaining).toBe(5)
    })

    it("does nothing for unknown key", () => {
      resetRateLimit("ip:unknown")
      expect(checkRateLimit("ip:unknown").allowed).toBe(true)
    })
  })

  describe("cleanupExpiredEntries", () => {
    it("removes expired entries", () => {
      recordFailedAttempt("ip:old")
      vi.advanceTimersByTime(31 * 60 * 1000)

      recordFailedAttempt("ip:new") // This triggers cleanup if size >= 100

      // Manually call cleanup
      cleanupExpiredEntries()

      // "ip:old" should be cleaned up, "ip:new" should remain
      expect(checkRateLimit("ip:new").remaining).toBe(4)
    })

    it("keeps non-expired entries", () => {
      recordFailedAttempt("ip:active")
      vi.advanceTimersByTime(60 * 1000) // Only 1 minute

      cleanupExpiredEntries()

      expect(checkRateLimit("ip:active").remaining).toBe(4)
    })
  })

  describe("resetAllRateLimits", () => {
    it("clears all entries", () => {
      recordFailedAttempt("ip:1.1.1.1")
      recordFailedAttempt("ip:2.2.2.2")
      recordFailedAttempt("email:test@example.com")

      resetAllRateLimits()

      expect(checkRateLimit("ip:1.1.1.1").remaining).toBe(5)
      expect(checkRateLimit("ip:2.2.2.2").remaining).toBe(5)
      expect(checkRateLimit("email:test@example.com").remaining).toBe(5)
    })
  })
})
