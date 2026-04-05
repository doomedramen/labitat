import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock fs and path modules for jsdom environment
const mockFs = {
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
  existsSync: vi.fn(),
  mkdirSync: vi.fn(),
  unlinkSync: vi.fn(),
}

vi.mock("fs", () => mockFs)
vi.mock("path", () => ({
  default: {
    join: (...args: string[]) => args.join("/"),
  },
}))

const { checkRateLimit, recordFailedAttempt, resetRateLimit, clearRateLimits } =
  await import("@/lib/rate-limit")

describe("rate-limit", () => {
  beforeEach(() => {
    clearRateLimits()
  })

  it("allows requests when under limit", () => {
    expect(checkRateLimit("test-key").allowed).toBe(true)
  })

  it("blocks after max attempts", () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("test-key")
    }
    const result = checkRateLimit("test-key")
    expect(result.allowed).toBe(false)
    expect(result.retryAfterMs).toBeDefined()
    expect(result.retryAfterMs!).toBeGreaterThan(0)
  })

  it("allows requests below max attempts", () => {
    for (let i = 0; i < 4; i++) {
      recordFailedAttempt("test-key")
    }
    expect(checkRateLimit("test-key").allowed).toBe(true)
  })

  it("resets after successful login", () => {
    for (let i = 0; i < 3; i++) {
      recordFailedAttempt("test-key")
    }
    resetRateLimit("test-key")
    expect(checkRateLimit("test-key").allowed).toBe(true)
  })

  it("tracks different keys independently", () => {
    for (let i = 0; i < 5; i++) {
      recordFailedAttempt("user-a")
    }
    expect(checkRateLimit("user-a").allowed).toBe(false)
    expect(checkRateLimit("user-b").allowed).toBe(true)
  })

  it("clears all rate limits", () => {
    recordFailedAttempt("key1")
    recordFailedAttempt("key2")
    clearRateLimits()
    expect(checkRateLimit("key1").allowed).toBe(true)
    expect(checkRateLimit("key2").allowed).toBe(true)
  })
})
