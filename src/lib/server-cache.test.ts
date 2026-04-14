import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/db", () => ({
  db: {
    select: vi.fn().mockReturnValue({
      from: vi.fn().mockReturnValue({
        all: vi.fn().mockReturnValue([]),
      }),
    }),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockReturnValue({
        onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
      }),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    }),
  },
}));

vi.mock("@/lib/db/schema", () => ({
  widgetCache: {
    itemId: "itemId",
  },
}));

describe("server-cache", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("CachedItem interface", () => {
    it("should have correct structure", async () => {
      const { serverCache } = await import("@/lib/server-cache");
      expect(serverCache).toBeDefined();
      expect(serverCache).toHaveProperty("get");
      expect(serverCache).toHaveProperty("set");
      expect(serverCache).toHaveProperty("getAll");
      expect(serverCache).toHaveProperty("getAllFresh");
      expect(serverCache).toHaveProperty("onUpdate");
      expect(serverCache).toHaveProperty("clear");
      expect(serverCache).toHaveProperty("delete");
      expect(serverCache).toHaveProperty("seed");
    });
  });

  describe("get", () => {
    it("returns null for non-existent item", async () => {
      const { serverCache } = await import("@/lib/server-cache");
      serverCache.clear();
      const result = serverCache.get("non-existent");
      expect(result).toBeNull();
    });
  });

  describe("set and get", () => {
    it("stores and retrieves items", async () => {
      const { serverCache } = await import("@/lib/server-cache");
      serverCache.clear();

      serverCache.set("test-item", {
        widgetData: { status: "ok", stats: [] },
        pingStatus: { state: "healthy" },
      });

      const result = serverCache.get("test-item");
      expect(result).not.toBeNull();
      expect(result?.pingStatus?.state).toBe("healthy");
      expect(result?.lastFetchedAt).toBeGreaterThan(0);
    });
  });

  describe("getAll", () => {
    it("returns all cached items", async () => {
      const { serverCache } = await import("@/lib/server-cache");
      serverCache.clear();

      serverCache.set("item-1", { widgetData: { status: "ok", stats: [] } });
      serverCache.set("item-2", { widgetData: { status: "ok", stats: [] } });

      const all = serverCache.getAll();
      expect(all.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe("getAllFresh", () => {
    it("returns items within max age", async () => {
      const { serverCache } = await import("@/lib/server-cache");
      serverCache.clear();

      serverCache.set("fresh-item", { widgetData: { status: "ok", stats: [] } });

      const fresh = serverCache.getAllFresh(60000); // 1 minute
      // Item should be fresh (just created)
      expect(fresh.length).toBeGreaterThanOrEqual(1);
    });

    it("filters out stale items", async () => {
      const { serverCache } = await import("@/lib/server-cache");
      serverCache.clear();

      // Set item directly in cache with old timestamp
      serverCache.set("stale-item", {
        widgetData: { status: "ok", stats: [] },
      });

      // Manually set old timestamp
      const cache = serverCache as any;
      const item = cache.cache.get("stale-item");
      if (item) {
        item.lastFetchedAt = Date.now() - 1000000;
      }

      const fresh = serverCache.getAllFresh(60000); // 1 minute
      // Item should be filtered out (too old)
      const hasStaleItem = fresh.some(([id]) => id === "stale-item");
      expect(hasStaleItem).toBe(false);
    });
  });

  describe("onUpdate", () => {
    it("subscribes to updates and returns unsubscribe function", async () => {
      const { serverCache } = await import("@/lib/server-cache");
      serverCache.clear();

      const callback = vi.fn();
      const unsubscribe = serverCache.onUpdate(callback);

      expect(typeof unsubscribe).toBe("function");

      serverCache.set("update-item", { widgetData: { status: "ok", stats: [] } });

      expect(callback).toHaveBeenCalled();

      // Unsubscribe
      unsubscribe();
    });
  });

  describe("clear", () => {
    it("clears all cached items", async () => {
      const { serverCache } = await import("@/lib/server-cache");

      serverCache.set("to-clear", { widgetData: { status: "ok", stats: [] } });
      serverCache.clear();

      const result = serverCache.get("to-clear");
      expect(result).toBeNull();
    });
  });

  describe("delete", () => {
    it("removes item from cache", async () => {
      const { serverCache } = await import("@/lib/server-cache");
      serverCache.clear();

      serverCache.set("to-delete", { widgetData: { status: "ok", stats: [] } });
      await serverCache.delete("to-delete");

      const result = serverCache.get("to-delete");
      expect(result).toBeNull();
    });
  });
});
