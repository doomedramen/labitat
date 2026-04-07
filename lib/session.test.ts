import { describe, it, expect, vi, beforeEach } from "vitest"

describe("session configuration", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  describe("getSessionOptions", () => {
    it("returns session options with correct configuration", async () => {
      process.env.SECRET_KEY =
        "test-secret-key-that-is-at-least-32-characters-long!"
      ;(process.env as Record<string, string>).NODE_ENV = "test"

      const { getSessionOptions } = await import("@/lib/session")
      const options = getSessionOptions()

      expect(options.password).toBe(
        "test-secret-key-that-is-at-least-32-characters-long!"
      )
      expect(options.cookieName).toBe("labitat_session")
      expect(options.cookieOptions?.httpOnly).toBe(true)
      expect(options.cookieOptions?.sameSite).toBe("lax")
    })

    it("sets secure cookie in production", async () => {
      process.env.SECRET_KEY =
        "test-secret-key-that-is-at-least-32-characters-long!"
      ;(process.env as Record<string, string>).NODE_ENV = "production"

      const { getSessionOptions } = await import("@/lib/session")
      const options = getSessionOptions()

      expect(options.cookieOptions?.secure).toBe(true)
    })

    it("does not set secure cookie in development", async () => {
      process.env.SECRET_KEY =
        "test-secret-key-that-is-at-least-32-characters-long!"
      ;(process.env as Record<string, string>).NODE_ENV = "development"

      const { getSessionOptions } = await import("@/lib/session")
      const options = getSessionOptions()

      expect(options.cookieOptions?.secure).toBe(false)
    })

    it("uses empty string when SECRET_KEY is not set", async () => {
      delete process.env.SECRET_KEY
      ;(process.env as Record<string, string>).NODE_ENV = "test"

      const { getSessionOptions } = await import("@/lib/session")
      const options = getSessionOptions()

      expect(options.password).toBe("")
    })
  })
})
