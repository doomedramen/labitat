import { describe, expect, it, vi } from "vitest";
import { liveStore } from "@/lib/live-store";
import type { ItemLive } from "@/lib/live-types";

const mockItemLive: ItemLive = {
  widgetData: null,
  pingStatus: null,
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
});
