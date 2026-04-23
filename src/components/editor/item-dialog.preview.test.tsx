import { describe, expect, it, vi } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { LiveProvider } from "@/components/dashboard/live-provider";
import { ItemDialog } from "@/components/editor/item-dialog";
import type { ItemLive } from "@/lib/live-types";
import type { ItemWithCache } from "@/lib/types";

vi.mock("web-haptics/react", () => ({
  useWebHaptics: () => ({ trigger: vi.fn() }),
}));

vi.mock("@/actions/items", () => ({
  createItem: vi.fn(),
  updateItem: vi.fn(),
  getItemConfig: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/actions/services", () => ({
  fetchServiceData: vi.fn(),
}));

describe("ItemDialog preview", () => {
  it("fires fetchServiceData once per dialog open", async () => {
    const { fetchServiceData } = await import("@/actions/services");
    const fetchSpy = vi.mocked(fetchServiceData);
    fetchSpy.mockResolvedValue({
      _status: "ok",
      movies: 42,
      queued: 1,
    });

    const snapshot: Record<string, ItemLive> = {
      a: {
        widgetData: null,
        pingStatus: null,
        lastFetchedAt: null,
        itemLastUpdateAt: null,
      },
    };

    const item: ItemWithCache = {
      id: "a",
      groupId: "g1",
      label: "Radarr",
      href: "https://radarr.test",
      iconUrl: null,
      serviceType: "radarr",
      serviceUrl: "https://radarr.test",
      configEnc: null,
      order: 0,
      pollingMs: 10_000,
      displayMode: "label",
      statDisplayMode: "label",
      statCardOrder: null,
      createdAt: null,
      cachedWidgetData: null,
      cachedPingStatus: null,
      cachedDataAge: null,
    };

    const { rerender } = render(
      <LiveProvider initialSnapshotById={snapshot} snapshotKey="key_item_dialog_preview" enableSse={false}>
        <ItemDialog
          open={true}
          onOpenChange={() => {}}
          item={item}
          groupId="g1"
          onGroupsChanged={() => {}}
        />
      </LiveProvider>,
    );

    await waitFor(() => expect(fetchSpy).toHaveBeenCalledTimes(1));

    rerender(
      <LiveProvider initialSnapshotById={snapshot} snapshotKey="key_item_dialog_preview" enableSse={false}>
        <ItemDialog
          open={true}
          onOpenChange={() => {}}
          item={item}
          groupId="g1"
          onGroupsChanged={() => {}}
        />
      </LiveProvider>,
    );

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
