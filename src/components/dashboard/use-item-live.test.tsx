import { StrictMode } from "react";
import { act, render, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { LiveProvider } from "@/components/dashboard/live-provider";
import { useItemLive } from "@/components/dashboard/use-item-live";
import { liveStore } from "@/lib/live-store";
import type { ItemLive } from "@/lib/live-types";

const mockItemLive: ItemLive = {
  widgetData: null,
  pingStatus: null,
  lastFetchedAt: null,
  itemLastUpdateAt: null,
};

const snapshot = { a: mockItemLive, b: mockItemLive } satisfies Record<string, ItemLive>;

const mockUpdate = {
  widgetData: { _status: "ok" as const },
  pingStatus: { state: "healthy" as const },
};

describe("useItemLive", () => {
  it("only re-renders the subscribed item", () => {
    const counts = { a: 0, b: 0 };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <LiveProvider
        initialSnapshotById={snapshot}
        snapshotKey="key_useItemLive_rerenders"
        enableSse={false}
      >
        {children}
      </LiveProvider>
    );

    renderHook(
      () => {
        counts.a++;
        return useItemLive("a");
      },
      { wrapper },
    );

    renderHook(
      () => {
        counts.b++;
        return useItemLive("b");
      },
      { wrapper },
    );

    act(() => liveStore.updateFromSse("a", { ...mockUpdate, fetchedAt: 1000 }));

    expect(counts.a).toBe(2);
    expect(counts.b).toBe(1);
  });

  it("survives StrictMode remount without wiping live state", () => {
    const { rerender } = render(
      <StrictMode>
        <LiveProvider
          initialSnapshotById={snapshot}
          snapshotKey="key_strictmode_survives"
          enableSse={false}
        >
          <div />
        </LiveProvider>
      </StrictMode>,
    );

    act(() => liveStore.updateFromSse("a", { ...mockUpdate, fetchedAt: 1000 }));

    rerender(
      <StrictMode>
        <LiveProvider
          initialSnapshotById={snapshot}
          snapshotKey="key_strictmode_survives"
          enableSse={false}
        >
          <div />
        </LiveProvider>
      </StrictMode>,
    );

    expect(liveStore.getSnapshot("a")?.itemLastUpdateAt).toBe(1000);
  });
});
