import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("polling supervisor scheduling", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.useRealTimers();
  });

  it("does not fall back to a 100ms timer while a due poll is still in flight", async () => {
    let resolvePoll: (() => void) | undefined;

    vi.doMock("@/lib/db", () => ({
      db: {
        select: () => ({
          from: () => [
            {
              id: "slow-item",
              serviceType: "slow-service",
              href: null,
              serviceUrl: "http://slow.test",
              configEnc: null,
              pollingMs: 1000,
            },
          ],
        }),
      },
    }));

    vi.doMock("@/lib/adapters", () => ({
      getService: () => ({
        defaultPollingMs: 1000,
        fetchData: () =>
          new Promise((resolve) => {
            resolvePoll = () => resolve({ _status: "ok" as const });
          }),
      }),
    }));

    vi.doMock("@/lib/crypto", () => ({
      decrypt: async () => "{}",
    }));

    vi.doMock("@/lib/adapters/fetch-with-timeout", () => ({
      fetchWithTimeout: vi.fn(),
    }));

    vi.doMock("@/lib/server-cache", () => ({
      serverCache: {
        get: vi.fn(() => null),
        set: vi.fn(),
      },
    }));

    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
    const { pollingSup } = await import("@/lib/polling-supervisor");

    pollingSup.stop();
    pollingSup.invalidateCache();
    pollingSup.connect();

    await vi.advanceTimersByTimeAsync(1000);

    const delays = setTimeoutSpy.mock.calls.map(([, delay]) => delay);
    const lastDelay = delays.at(-1);

    expect(lastDelay).toBeGreaterThanOrEqual(1000);

    resolvePoll?.();
    await vi.runOnlyPendingTimersAsync();
    pollingSup.stop();
  });

  it("does not immediately repoll every item after the grace-period stop/restart cycle", async () => {
    let pollCount = 0;

    vi.doMock("@/lib/db", () => ({
      db: {
        select: () => ({
          from: () => [
            {
              id: "item-1",
              serviceType: "svc-1",
              href: null,
              serviceUrl: "http://one.test",
              configEnc: null,
              pollingMs: 60_000,
            },
            {
              id: "item-2",
              serviceType: "svc-2",
              href: null,
              serviceUrl: "http://two.test",
              configEnc: null,
              pollingMs: 60_000,
            },
            {
              id: "item-3",
              serviceType: "svc-3",
              href: null,
              serviceUrl: "http://three.test",
              configEnc: null,
              pollingMs: 60_000,
            },
          ],
        }),
      },
    }));

    vi.doMock("@/lib/adapters", () => ({
      getService: (serviceType: string) => ({
        defaultPollingMs: 60_000,
        fetchData: async () => {
          pollCount += 1;
          return { _status: "ok" as const, serviceType };
        },
      }),
    }));

    vi.doMock("@/lib/crypto", () => ({
      decrypt: async () => "{}",
    }));

    vi.doMock("@/lib/adapters/fetch-with-timeout", () => ({
      fetchWithTimeout: vi.fn(),
    }));

    vi.doMock("@/lib/server-cache", () => ({
      serverCache: {
        get: vi.fn(() => null),
        set: vi.fn(),
      },
    }));

    const { pollingSup } = await import("@/lib/polling-supervisor");

    pollingSup.stop();
    pollingSup.invalidateCache();
    pollingSup.connect();

    await vi.advanceTimersByTimeAsync(100);
    expect(pollCount).toBe(3);

    pollingSup.disconnect();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    const pollCountBeforeReconnect = pollCount;

    pollingSup.connect();
    await vi.advanceTimersByTimeAsync(100);

    expect(pollCount).toBe(pollCountBeforeReconnect);

    pollingSup.stop();
  });
});

describe("server cache freshness", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doUnmock("@/lib/server-cache");
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("returns the just-written value from getAllFresh even before SQLite persistence resolves", async () => {
    const persistedRows = [
      {
        itemId: "item-1",
        widgetData: { _status: "ok", value: "stale" },
        pingStatus: null,
        updatedAt: new Date(0).toISOString(),
      },
    ];

    let releaseWrite: (() => void) | undefined;

    vi.doMock("@/lib/db", () => ({
      db: {
        select: () => ({
          from: () => ({
            all: () => persistedRows,
          }),
        }),
        insert: () => ({
          values: () => ({
            onConflictDoUpdate: () =>
              new Promise<void>((resolve) => {
                releaseWrite = resolve;
              }),
          }),
        }),
      },
    }));

    const { serverCache } = await import("@/lib/server-cache");
    serverCache.clear();

    serverCache.set("item-1", {
      widgetData: { _status: "ok", value: "fresh" },
    });

    expect(serverCache.get("item-1")?.widgetData).toEqual({
      _status: "ok",
      value: "fresh",
    });

    const freshEntries = new Map(serverCache.getAllFresh());

    expect(freshEntries.get("item-1")?.widgetData).toEqual({
      _status: "ok",
      value: "fresh",
    });

    releaseWrite?.();
  });

  it("does not hit SQLite again on every getAllFresh call", async () => {
    const originalNodeEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";
    let dbSelectCalls = 0;

    vi.doMock("@/lib/db", () => ({
      db: {
        select: () => {
          dbSelectCalls += 1;
          return {
            from: () => ({
              all: () => [
                {
                  itemId: "item-1",
                  widgetData: { _status: "ok", value: "cached" },
                  pingStatus: null,
                  updatedAt: new Date().toISOString(),
                },
              ],
            }),
          };
        },
        insert: () => ({
          values: () => ({
            onConflictDoUpdate: vi.fn(),
          }),
        }),
      },
    }));

    try {
      const { serverCache } = await import("@/lib/server-cache");
      serverCache.clear();

      expect(serverCache.getAllFresh()).toHaveLength(1);
      expect(serverCache.getAllFresh()).toHaveLength(1);
      expect(dbSelectCalls).toBe(1);
    } finally {
      process.env.NODE_ENV = originalNodeEnv;
    }
  });
});
