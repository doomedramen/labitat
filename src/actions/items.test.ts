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

describe("item metric and service settings", () => {
  beforeEach(() => vi.resetModules());
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  async function setupUpdate() {
    const set = vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));
    vi.doMock("@/lib/auth/guard", () => ({ requireAuth: vi.fn().mockResolvedValue("user") }));
    vi.doMock("@/lib/db", () => ({
      db: {
        select: () => ({
          from: () => ({
            where: () =>
              Promise.resolve([
                {
                  id: "a",
                  serviceType: "old-service",
                  href: null,
                  serviceUrl: "https://old.test",
                  configEnc: "old-config",
                  configurationRevision: 1,
                  statCardOrder: '{"active":["old"],"unused":[]}',
                },
              ]),
          }),
        }),
        update: () => ({ set }),
      },
    }));
    vi.doMock("@/lib/crypto", () => ({
      decrypt: async () => JSON.stringify({ url: "https://old.test", apiKey: "old-key" }),
      encrypt: async (value: string) => value,
    }));
    vi.doMock("@/lib/adapters", () => ({
      getService: () => ({
        configFields: [
          { key: "url", type: "url" },
          { key: "apiKey", type: "password" },
        ],
      }),
    }));
    vi.doMock("@/lib/structural-cache", () => ({
      refreshGroupsCache: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/polling-supervisor", () => ({ pollingSup: { invalidateCache: vi.fn() } }));
    vi.doMock("@/lib/server-cache", () => ({ serverCache: { delete: vi.fn() } }));
    return { set, updateItem: (await import("@/actions/items")).updateItem };
  }
  it("persists Reset to defaults as an explicit null selection", async () => {
    const { set, updateItem } = await setupUpdate();
    const form = new FormData();
    form.set("label", "A");
    form.set("serviceType", "old-service");
    form.set("statCardOrder", "null");
    await updateItem("a", form);
    expect(set).toHaveBeenCalledWith(expect.objectContaining({ statCardOrder: null }));
  });
  it("does not carry old credentials and endpoints into a different service", async () => {
    const { set, updateItem } = await setupUpdate();
    const form = new FormData();
    form.set("label", "A");
    form.set("serviceType", "new-service");
    await updateItem("a", form);
    expect(set).toHaveBeenCalledWith(
      expect.objectContaining({ configEnc: null, serviceUrl: null, configurationRevision: 2 }),
    );
  });
});
