import { describe, expect, it, vi } from "vitest";
import { liveStore } from "@/lib/live-store";
import type { ItemLive } from "@/lib/live-types";

const mockItemLive: ItemLive = {
  widgetData: null,
  pingStatus: null,
  configurationRevision: 0,
  observationUpdatedAt: null,
  lastAttemptAt: null,
  lastSuccessAt: null,
  freshness: "unknown",
  lastFetchedAt: null,
  itemLastUpdateAt: null,
};

const mockUpdate = {
  widgetData: { _status: "ok" as const },
  pingStatus: { state: "healthy" as const },
};

describe("liveStore", () => {
  it("only notifies listeners for the updated item", () => {
    liveStore.initOnce({ a: mockItemLive, b: mockItemLive }, "key_only_notifies");
    const cbA = vi.fn();
    const cbB = vi.fn();
    liveStore.subscribeItem("a", cbA);
    liveStore.subscribeItem("b", cbB);

    liveStore.updateFromSse("a", { ...mockUpdate, fetchedAt: 1000 });

    expect(cbA).toHaveBeenCalledOnce();
    expect(cbB).not.toHaveBeenCalled();
  });

  it("ignores updates for unknown itemIds", () => {
    liveStore.initOnce({ a: mockItemLive }, "key_ignores_unknown");
    const cb = vi.fn();
    liveStore.subscribeItem("a", cb);

    liveStore.updateFromSse("unknown", { ...mockUpdate, fetchedAt: 1000 });

    expect(cb).not.toHaveBeenCalled();
  });

  it("initOnce is a no-op when called with the same key", () => {
    liveStore.initOnce({ a: mockItemLive }, "key_noop_same");

    liveStore.updateFromSse("a", { ...mockUpdate, fetchedAt: 1000 });
    liveStore.initOnce({ a: mockItemLive }, "key_noop_same"); // same key

    expect(liveStore.getSnapshot("a")?.itemLastUpdateAt).toBe(1000); // update preserved
  });

  it("keeps newer observations and surviving subscriptions during membership reconciliation", () => {
    liveStore.initOnce({ a: mockItemLive, b: mockItemLive }, "key_membership_before");
    const cbA = vi.fn();
    const cbB = vi.fn();
    const unsubscribeA = liveStore.subscribeItem("a", cbA);
    liveStore.subscribeItem("b", cbB);

    liveStore.updateFromSse("a", {
      ...mockUpdate,
      fetchedAt: 2_000,
      configurationRevision: 0,
      observationUpdatedAt: 2_000,
      freshness: "fresh",
    });
    cbA.mockClear();
    cbB.mockClear();

    liveStore.initOnce(
      {
        a: { ...mockItemLive, observationUpdatedAt: 1_000, lastFetchedAt: 1_000 },
        b: { ...mockItemLive, widgetData: { value: "new-member-snapshot" } },
      },
      "key_membership_after",
    );

    expect(liveStore.getSnapshot("a")?.widgetData).toEqual(mockUpdate.widgetData);
    expect(liveStore.getSnapshot("b")?.widgetData).toEqual({ value: "new-member-snapshot" });

    liveStore.initOnce({ a: { ...mockItemLive, observationUpdatedAt: 3_000 } }, "key_removed");
    expect(liveStore.getSnapshot("b")).toBeNull();
    unsubscribeA();
  });

  it("accepts a new configuration generation and rejects late old-generation data", () => {
    liveStore.initOnce({ a: { ...mockItemLive, configurationRevision: 1 } }, "key_generation_one");
    liveStore.updateFromSse("a", {
      ...mockUpdate,
      fetchedAt: 5_000,
      configurationRevision: 1,
      observationUpdatedAt: 5_000,
      freshness: "fresh",
    });

    liveStore.initOnce(
      {
        a: {
          ...mockItemLive,
          configurationRevision: 2,
          observationUpdatedAt: null,
          lastFetchedAt: null,
        },
      },
      "key_generation_two",
    );
    expect(liveStore.getSnapshot("a")?.configurationRevision).toBe(2);
    expect(liveStore.getSnapshot("a")?.widgetData).toBeNull();

    liveStore.updateFromSse("a", {
      widgetData: { value: "late-old" },
      pingStatus: null,
      fetchedAt: 6_000,
      configurationRevision: 1,
      observationUpdatedAt: 6_000,
      freshness: "fresh",
    });
    expect(liveStore.getSnapshot("a")?.widgetData).toBeNull();
  });
});
