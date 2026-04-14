import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("deleteItem", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("removes the persisted widget cache entry for the deleted item", async () => {
    const where = vi.fn().mockResolvedValue(undefined);
    const deleteMock = vi.fn(() => ({ where }));
    const invalidateCache = vi.fn();
    const refreshGroupsCache = vi.fn().mockResolvedValue([]);

    vi.doMock("@/lib/auth/guard", () => ({
      requireAuth: vi.fn().mockResolvedValue("user-1"),
    }));

    vi.doMock("@/lib/db", () => ({
      db: {
        delete: deleteMock,
      },
    }));

    vi.doMock("@/lib/structural-cache", () => ({
      refreshGroupsCache,
    }));

    vi.doMock("@/lib/polling-supervisor", () => ({
      pollingSup: {
        invalidateCache,
      },
    }));

    const { deleteItem } = await import("@/actions/items");

    await deleteItem("item-1");

    expect(deleteMock).toHaveBeenCalledTimes(2);
    expect(invalidateCache).toHaveBeenCalledTimes(1);
    expect(refreshGroupsCache).toHaveBeenCalledTimes(1);
  });
});
