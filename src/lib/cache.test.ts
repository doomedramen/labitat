import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"

// Mock env before anything imports it
vi.mock("@/lib/env", () => ({
  env: {
    NODE_ENV: "test",
    CACHE_DIR: "/tmp/labitat-test-cache",
  },
}))

import {
  getCached,
  getCachedAny,
  getCachedWithFallback,
  setCached,
  deleteCached,
  clearCache,
} from "@/lib/cache"

describe("cache", () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"))
    clearCache()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe("getCached / setCached", () => {
    it("returns null for missing key", async () => {
      const result = await getCached("missing-key", 60_000)
      expect(result).toBeNull()
    })

    it("stores and retrieves a value", async () => {
      setCached("test-key", { name: "test" })
      const result = await getCached<{ name: string }>("test-key", 60_000)

      expect(result).toEqual({ name: "test" })
    })

    it("stores and retrieves primitive values", async () => {
      setCached("number", 42)
      const result = await getCached<number>("number", 60_000)
      expect(result).toBe(42)
    })

    it("stores and retrieves string values", async () => {
      setCached("string", "hello")
      const result = await getCached<string>("string", 60_000)
      expect(result).toBe("hello")
    })

    it("returns null after TTL expires", async () => {
      setCached("ttl-key", "data")
      vi.advanceTimersByTime(61_000)

      const result = await getCached("ttl-key", 60_000)
      expect(result).toBeNull()
    })

    it("returns value just before TTL expires", async () => {
      setCached("ttl-key", "data")
      vi.advanceTimersByTime(59_000)

      const result = await getCached("ttl-key", 60_000)
      expect(result).toBe("data")
    })

    it("handles different keys independently", async () => {
      setCached("key-a", "value-a")
      setCached("key-b", "value-b")

      expect(await getCached("key-a", 60_000)).toBe("value-a")
      expect(await getCached("key-b", 60_000)).toBe("value-b")
    })
  })

  describe("getCachedAny", () => {
    it("returns cached value regardless of TTL", async () => {
      setCached("any-key", "data")
      vi.advanceTimersByTime(999_999) // Well past any TTL

      const result = await getCachedAny("any-key")
      expect(result).toBe("data")
    })

    it("returns null for missing key", async () => {
      const result = await getCachedAny("nonexistent")
      expect(result).toBeNull()
    })
  })

  describe("getCachedWithFallback", () => {
    it("returns fresh data when within TTL", async () => {
      setCached("fb-key", "fresh-data")

      const result = await getCachedWithFallback<string>("fb-key", 60_000)
      expect(result.fresh).toBe("fresh-data")
      expect(result.expired).toBeNull()
    })

    it("returns expired data as fallback when TTL exceeded", async () => {
      setCached("fb-key", "stale-data")
      vi.advanceTimersByTime(61_000)

      const result = await getCachedWithFallback<string>("fb-key", 60_000)
      expect(result.fresh).toBeNull()
      expect(result.expired).toBe("stale-data")
    })

    it("returns both null for missing key", async () => {
      const result = await getCachedWithFallback("nonexistent", 60_000)
      expect(result.fresh).toBeNull()
      expect(result.expired).toBeNull()
    })
  })

  describe("deleteCached", () => {
    it("removes a cached key", async () => {
      setCached("del-key", "data")
      expect(await getCached("del-key", 60_000)).toBe("data")

      deleteCached("del-key")
      expect(await getCached("del-key", 60_000)).toBeNull()
    })

    it("does nothing for missing key", async () => {
      await deleteCached("nonexistent") // Should not throw
    })
  })

  describe("clearCache", () => {
    it("clears all cached entries", async () => {
      setCached("key-1", "data-1")
      setCached("key-2", "data-2")

      clearCache()

      expect(await getCached("key-1", 60_000)).toBeNull()
      expect(await getCached("key-2", 60_000)).toBeNull()
    })

    it("clears the in-memory cache map", async () => {
      setCached("key-1", "data-1")
      clearCache()
      expect(await getCachedAny("key-1")).toBeNull()
    })
  })

  describe("memory persistence", () => {
    it("stores data in memory immediately", async () => {
      setCached("persist-key", "data")
      const result = await getCachedAny("persist-key")
      expect(result).toBe("data")
    })

    it("retains data across TTL when accessed via getCachedAny", async () => {
      setCached("persist-key", "data")
      vi.advanceTimersByTime(999_999) // Well past any TTL

      // getCachedAny ignores TTL, so data should still be there
      const result = await getCachedAny("persist-key")
      expect(result).toBe("data")
    })
  })
})
