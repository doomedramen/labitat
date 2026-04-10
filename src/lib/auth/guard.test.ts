import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock getSession before importing guard
const mockGetSession = vi.fn()
vi.mock("@/lib/auth/index", () => ({
  getSession: () => mockGetSession(),
}))

import { requireAuth, isAuthenticated } from "@/lib/auth/guard"

describe("guard", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe("requireAuth", () => {
    it("returns userId when user is logged in", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: true,
        userId: "user-123",
      })

      const userId = await requireAuth()
      expect(userId).toBe("user-123")
    })

    it("throws when loggedIn is false", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: false,
        userId: "",
      })

      await expect(requireAuth()).rejects.toThrow("Unauthorized")
    })

    it("throws when loggedIn is true but userId is empty", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: true,
        userId: "",
      })

      await expect(requireAuth()).rejects.toThrow("Unauthorized")
    })

    it("throws when loggedIn is true but userId is undefined", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: true,
        userId: undefined,
      })

      await expect(requireAuth()).rejects.toThrow("Unauthorized")
    })

    it("throws when session is completely empty", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: false,
        userId: "",
      })

      await expect(requireAuth()).rejects.toThrow("Unauthorized")
    })
  })

  describe("isAuthenticated", () => {
    it("returns true when user is logged in", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: true,
        userId: "user-123",
      })

      expect(await isAuthenticated()).toBe(true)
    })

    it("returns false when user is not logged in", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: false,
        userId: "",
      })

      expect(await isAuthenticated()).toBe(false)
    })

    it("returns false when loggedIn is undefined", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: undefined,
        userId: undefined,
      })

      expect(await isAuthenticated()).toBe(false)
    })
  })
})
