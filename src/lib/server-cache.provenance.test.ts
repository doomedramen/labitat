import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  rows: [] as Record<string, unknown>[],
  writes: [] as Record<string, unknown>[],
}));
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({ from: () => ({ all: () => mocks.rows }) }),
    insert: () => ({
      values: (value: Record<string, unknown>) => ({
        onConflictDoUpdate: () => {
          mocks.writes.push(value);
          return Promise.resolve();
        },
      }),
    }),
  },
}));
import { serverCache } from "./server-cache";
beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(1_000_000);
  mocks.rows = [];
  mocks.writes = [];
  serverCache.clear();
});
afterEach(() => vi.useRealTimers());
describe("cache freshness provenance", () => {
  it("does not inherit success history from a different endpoint generation", () => {
    serverCache.set("a", { widgetData: { count: 42 } }, { configurationRevision: 1 });
    serverCache.set(
      "a",
      { widgetData: { _status: "error" } },
      { configurationRevision: 2, successful: false },
    );
    expect(serverCache.get("a")?.lastSuccessAt).toBeNull();
  });
  it("retains last successful data age across repeated failed observations and restart", () => {
    serverCache.set("a", { widgetData: { count: 42 } });
    vi.advanceTimersByTime(60_000);
    serverCache.set("a", { widgetData: { count: 42, _status: "warn" } }, { successful: false });
    expect(serverCache.get("a")).toMatchObject({ lastSuccessAt: 1_000_000, freshness: "stale" });
    vi.advanceTimersByTime(60_000);
    serverCache.set("a", { widgetData: { count: 42, _status: "warn" } }, { successful: false });
    expect(serverCache.get("a")?.lastSuccessAt).toBe(1_000_000);
    mocks.rows = [mocks.writes.at(-1)!];
    serverCache.clear();
    expect(serverCache.get("a")).toMatchObject({ lastSuccessAt: 1_000_000, freshness: "stale" });
    expect(serverCache.getAllFresh(30_000)).toEqual([]);
  });
  it("does not invent a successful update time for legacy saved data", () => {
    mocks.rows = [
      { itemId: "legacy", widgetData: { count: 3 }, updatedAt: new Date().toISOString() },
    ];
    expect(serverCache.get("legacy")).toMatchObject({ lastSuccessAt: null, freshness: "unknown" });
  });
  it("does not lose other persisted entries when the first operation is a write", () => {
    mocks.rows = [
      { itemId: "legacy", widgetData: { count: 3 }, updatedAt: new Date().toISOString() },
    ];
    serverCache.set("new", { widgetData: { count: 9 } });
    expect(serverCache.get("legacy")?.widgetData).toEqual({ count: 3 });
  });
});
