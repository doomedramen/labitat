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

  it("does not log item counts when refreshing the polling cache", async () => {
    const consoleLog = vi.spyOn(console, "log").mockImplementation(() => undefined);

    vi.doMock("@/lib/db", () => ({
      db: {
        select: (fields?: unknown) => ({
          from: () =>
            fields
              ? { where: () => ({ get: () => ({ revision: 0 }) }) }
              : [
                  {
                    id: "item-1",
                    serviceType: null,
                    href: null,
                    serviceUrl: null,
                    configEnc: null,
                    configurationRevision: 0,
                    pollingMs: 60_000,
                  },
                ],
        }),
      },
    }));

    vi.doMock("@/lib/adapters", () => ({ getService: vi.fn() }));
    vi.doMock("@/lib/crypto", () => ({ decrypt: vi.fn() }));
    vi.doMock("@/lib/adapters/fetch-with-timeout", () => ({ fetchWithTimeout: vi.fn() }));
    vi.doMock("@/lib/server-cache", () => ({
      serverCache: { get: vi.fn(() => null), set: vi.fn() },
    }));

    const { pollingSup } = await import("@/lib/polling-supervisor");
    pollingSup.stop();
    pollingSup.invalidateCache();
    pollingSup.connect();
    await vi.advanceTimersByTimeAsync(1);

    expect(consoleLog).not.toHaveBeenCalledWith(expect.stringMatching(/Loaded \d+ item\(s\)/));

    pollingSup.stop();
  });

  it("does not fall back to a 100ms timer while a due poll is still in flight", async () => {
    let resolvePoll: (() => void) | undefined;

    vi.doMock("@/lib/db", () => ({
      db: {
        select: (fields?: unknown) => ({
          from: () =>
            fields
              ? { where: () => ({ get: () => ({ revision: 0 }) }) }
              : [
                  {
                    id: "slow-item",
                    serviceType: "slow-service",
                    href: null,
                    serviceUrl: "http://slow.test",
                    configEnc: null,
                    configurationRevision: 0,
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

  it("does not burst-poll when entering idle after the grace period", async () => {
    let pollCount = 0;

    vi.doMock("@/lib/db", () => ({
      db: {
        select: (fields?: unknown) => ({
          from: () =>
            fields
              ? { where: () => ({ get: () => ({ revision: 0 }) }) }
              : [
                  {
                    id: "item-1",
                    serviceType: "svc-1",
                    href: null,
                    serviceUrl: "http://one.test",
                    configEnc: null,
                    configurationRevision: 0,
                    pollingMs: 60_000,
                  },
                  {
                    id: "item-2",
                    serviceType: "svc-2",
                    href: null,
                    serviceUrl: "http://two.test",
                    configEnc: null,
                    configurationRevision: 0,
                    pollingMs: 60_000,
                  },
                  {
                    id: "item-3",
                    serviceType: "svc-3",
                    href: null,
                    serviceUrl: "http://three.test",
                    configEnc: null,
                    configurationRevision: 0,
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

    // Staggering spreads items over 2 seconds, so we need to wait long enough.
    await vi.advanceTimersByTimeAsync(2100);
    expect(pollCount).toBe(3);

    pollingSup.disconnect();
    await vi.advanceTimersByTimeAsync(5 * 60 * 1000 + 100);
    // Entering idle mode does not burst-poll overdue items; they wait for their idle slots.
    expect(pollCount).toBe(4);

    pollingSup.connect();
    await vi.advanceTimersByTimeAsync(100);

    // A returning viewer refreshes the overdue items once, not repeatedly.
    expect(pollCount).toBe(7);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(pollCount).toBe(7);

    pollingSup.stop();
  });

  it("records an unreachable service without logging the expected poll failure", async () => {
    const pollError = new Error("Whisparr error: 401");
    const cacheSet = vi.fn();
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    vi.doMock("@/lib/db", () => ({
      db: {
        select: (fields?: unknown) => ({
          from: () =>
            fields
              ? { where: () => ({ get: () => ({ revision: 0 }) }) }
              : [
                  {
                    id: "offline-item",
                    serviceType: "offline-service",
                    href: null,
                    serviceUrl: "http://offline.test",
                    configEnc: null,
                    configurationRevision: 0,
                    pollingMs: 1000,
                  },
                ],
        }),
      },
    }));

    vi.doMock("@/lib/adapters", () => ({
      getService: () => ({
        defaultPollingMs: 1000,
        fetchData: vi.fn().mockRejectedValue(pollError),
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
        set: cacheSet,
      },
    }));

    const { pollingSup } = await import("@/lib/polling-supervisor");

    pollingSup.stop();
    pollingSup.invalidateCache();
    pollingSup.connect();
    await vi.advanceTimersByTimeAsync(1);

    expect(consoleError).not.toHaveBeenCalled();
    expect(cacheSet).toHaveBeenCalledWith(
      "offline-item",
      {
        widgetData: {
          _status: "error",
          _statusText: "Service authentication failed (HTTP 401)",
        },
      },
      { successful: false, attemptAt: expect.any(Number), configurationRevision: 0 },
    );

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
    vi.stubEnv("NODE_ENV", "production");
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
                  lastSuccessAt: Date.now(),
                  freshness: "fresh",
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

    const { serverCache } = await import("@/lib/server-cache");
    serverCache.clear();

    expect(serverCache.getAllFresh()).toHaveLength(1);
    expect(serverCache.getAllFresh()).toHaveLength(1);
    expect(dbSelectCalls).toBe(1);
  });
});

describe("always-on operator collection", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.resetModules();
    vi.useRealTimers();
  });
  it("reuses one scheduler and staggers idle collection across the idle window", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    // Aligned to the 10-minute idle window so slot times are easy to read.
    const start = 1_800_000_000_000;
    vi.setSystemTime(start);
    const fetchFast = vi.fn().mockResolvedValue({ _status: "ok" });
    const fetchSlow = vi.fn().mockResolvedValue({ _status: "ok" });
    vi.doMock("@/lib/db", () => ({
      db: {
        select: (fields?: unknown) => ({
          from: () =>
            fields
              ? { where: () => ({ get: () => ({ revision: 0 }) }) }
              : [
                  {
                    id: "fast",
                    serviceType: "fast",
                    serviceUrl: "https://fast.test",
                    configEnc: null,
                    configurationRevision: 0,
                    pollingMs: 10000,
                  },
                  {
                    id: "slow",
                    serviceType: "slow",
                    serviceUrl: "https://slow.test",
                    configEnc: null,
                    configurationRevision: 0,
                    pollingMs: 120000,
                  },
                ],
        }),
      },
    }));
    vi.doMock("@/lib/adapters", () => ({
      getService: (id: string) => ({ fetchData: id === "fast" ? fetchFast : fetchSlow }),
    }));
    vi.doMock("@/lib/crypto", () => ({ decrypt: vi.fn() }));
    vi.doMock("@/lib/server-cache", () => ({ serverCache: { get: () => null, set: vi.fn() } }));
    const { pollingSup } = await import("./polling-supervisor");
    pollingSup.startBackground();
    pollingSup.startBackground();
    // Two services share the 10-minute idle window: slots at 0 and 5 minutes.
    await pollingSup.pollNow();
    expect(fetchFast).toHaveBeenCalledTimes(1);
    expect(fetchSlow).toHaveBeenCalledTimes(0);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(fetchFast).toHaveBeenCalledTimes(1);
    expect(fetchSlow).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(fetchFast).toHaveBeenCalledTimes(2);
    expect(fetchSlow).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(300_000);
    expect(fetchSlow).toHaveBeenCalledTimes(2);
    // An active client restores configured intervals.
    pollingSup.connect();
    await pollingSup.pollNow();
    await pollingSup.pollNow();
    expect(fetchFast).toHaveBeenCalledTimes(3);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchFast).toHaveBeenCalledTimes(4);
    // Going idle again does not repoll immediately; each service waits for its own slot.
    pollingSup.disconnect();
    await vi.advanceTimersByTimeAsync(start + 1_799_000 - Date.now());
    expect(fetchFast).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(1_000);
    expect(fetchFast).toHaveBeenCalledTimes(5);
    pollingSup.stop();
  });
});
