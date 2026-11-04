import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  revision: 2 as number | null,
  cached: null as import("./server-cache").CachedItem | null,
  set: vi.fn(),
}));
vi.mock("@/lib/db", () => ({
  db: {
    select: () => ({
      from: () => ({
        where: () => ({
          get: () => (mocks.revision === null ? undefined : { revision: mocks.revision }),
        }),
      }),
    }),
  },
}));
vi.mock("@/lib/server-cache", () => ({ serverCache: { get: () => mocks.cached, set: mocks.set } }));
import { saveServiceObservation } from "./service-observation";
beforeEach(() => {
  mocks.revision = 2;
  mocks.cached = null;
  mocks.set.mockClear();
});
describe("service observation writes", () => {
  it.each([1, null])("rejects results for obsolete or deleted configuration %s", (revision) => {
    mocks.revision = revision;
    saveServiceObservation("a", 2, 100, { value: "late" });
    expect(mocks.set).not.toHaveBeenCalled();
  });
  it("preserves useful values when an adapter returns an error without throwing", () => {
    mocks.cached = {
      widgetData: { count: 42 },
      pingStatus: null,
      lastFetchedAt: 90,
      lastAttemptAt: 80,
      lastSuccessAt: 80,
      freshness: "fresh",
      configurationRevision: 2,
    };
    saveServiceObservation("a", 2, 100, { _status: "error", _statusText: "Offline" });
    expect(mocks.set).toHaveBeenCalledWith(
      "a",
      { widgetData: { count: 42, _status: "warn", _statusText: "Offline" } },
      { successful: false, attemptAt: 100, configurationRevision: 2 },
    );
  });
  it("treats freshly observed degraded health as a successful fetch", () => {
    saveServiceObservation("a", 2, 100, { _status: "warn", battery: 30 });
    expect(mocks.set).toHaveBeenCalledWith(
      "a",
      expect.any(Object),
      expect.objectContaining({ successful: true }),
    );
  });
  it("rejects an older request completing after a newer request", () => {
    mocks.cached = {
      widgetData: { count: 42 },
      pingStatus: null,
      lastFetchedAt: 200,
      lastAttemptAt: 190,
      lastSuccessAt: 190,
      freshness: "fresh",
      configurationRevision: 2,
    };
    saveServiceObservation("a", 2, 100, { count: 3 });
    expect(mocks.set).not.toHaveBeenCalled();
  });
});
