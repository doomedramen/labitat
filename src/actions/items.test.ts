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

describe("createItem", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("invalidates both dashboard routes so the created item survives leaving edit mode", async () => {
    const revalidatePath = vi.fn();
    const values = vi.fn().mockResolvedValue(undefined);
    const insert = vi.fn(() => ({ values }));
    const where = vi.fn().mockResolvedValue([{ maxOrder: 0 }]);
    const from = vi.fn(() => ({ where }));
    const select = vi.fn(() => ({ from }));
    const refreshGroupsCache = vi.fn().mockResolvedValue([]);

    vi.doMock("next/cache", () => ({ revalidatePath }));
    vi.doMock("@/lib/auth/guard", () => ({
      requireAuth: vi.fn().mockResolvedValue("user-1"),
    }));
    vi.doMock("@/lib/db", () => ({ db: { select, insert } }));
    vi.doMock("@/lib/adapters", () => ({ getService: vi.fn().mockReturnValue(null) }));
    vi.doMock("@/lib/structural-cache", () => ({ refreshGroupsCache }));
    vi.doMock("@/lib/polling-supervisor", () => ({
      pollingSup: { invalidateCache: vi.fn() },
    }));
    vi.doMock("@/lib/server-cache", () => ({ serverCache: { delete: vi.fn() } }));

    const { createItem } = await import("@/actions/items");
    const formData = new FormData();
    formData.set("label", "Home Assistant");

    await createItem("group-1", formData);

    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/edit");
  });
});
