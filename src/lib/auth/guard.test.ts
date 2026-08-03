import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock getSession before importing guard
const mockGetSession = vi.fn();
const mockEnv = vi.hoisted(() => ({ AUTH_ENABLED: true }));
vi.mock("@/lib/auth/index", () => ({
  getSession: () => mockGetSession(),
}));
vi.mock("@/lib/env", () => ({ env: mockEnv }));

import { requireAuth, isAuthenticated, hasEditAccess } from "@/lib/auth/guard";

describe("guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnv.AUTH_ENABLED = true;
  });

  describe("requireAuth", () => {
    it("returns userId when user is logged in", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: true,
        userId: "user-123",
      });

      const userId = await requireAuth();
      expect(userId).toBe("user-123");
    });

    it("allows public mutations without reading a session when auth is disabled", async () => {
      mockEnv.AUTH_ENABLED = false;

      await expect(requireAuth()).resolves.toBe("public-access");
      expect(mockGetSession).not.toHaveBeenCalled();
    });

    it("throws when loggedIn is false", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: false,
        userId: "",
      });

      await expect(requireAuth()).rejects.toThrow("Unauthorized");
    });

    it("throws when loggedIn is true but userId is empty", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: true,
        userId: "",
      });

      await expect(requireAuth()).rejects.toThrow("Unauthorized");
    });

    it("throws when loggedIn is true but userId is undefined", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: true,
        userId: undefined,
      });

      await expect(requireAuth()).rejects.toThrow("Unauthorized");
    });

    it("throws when session is completely empty", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: false,
        userId: "",
      });

      await expect(requireAuth()).rejects.toThrow("Unauthorized");
    });
  });

  describe("isAuthenticated", () => {
    it("returns true when user is logged in", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: true,
        userId: "user-123",
      });

      expect(await isAuthenticated()).toBe(true);
    });

    it("returns false when user is not logged in", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: false,
        userId: "",
      });

      expect(await isAuthenticated()).toBe(false);
    });

    it("returns false when loggedIn is undefined", async () => {
      mockGetSession.mockResolvedValue({
        loggedIn: undefined,
        userId: undefined,
      });

      expect(await isAuthenticated()).toBe(false);
    });
  });

  describe("hasEditAccess", () => {
    it("returns true without reading a session when auth is disabled", async () => {
      mockEnv.AUTH_ENABLED = false;

      await expect(hasEditAccess()).resolves.toBe(true);
      expect(mockGetSession).not.toHaveBeenCalled();
    });

    it("uses the session when auth is enabled", async () => {
      mockGetSession.mockResolvedValue({ loggedIn: false, userId: "" });

      await expect(hasEditAccess()).resolves.toBe(false);
      expect(mockGetSession).toHaveBeenCalledOnce();
    });
  });
});
