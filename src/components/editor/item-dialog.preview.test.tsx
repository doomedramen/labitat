import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { http, HttpResponse } from "msw";
import { LiveProvider } from "@/components/dashboard/live-provider";
import { ItemDialog } from "@/components/editor/item-dialog";
import type { ItemLive } from "@/lib/live-types";
import type { ItemWithCache } from "@/lib/types";
import { server } from "@/tests/mocks/node";

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
  it("searches icon names and selects a slug without requiring a full URL", async () => {
    server.use(
      http.get("*/api/icons", () =>
        HttpResponse.json([{ name: "13 Feet Ladder", slug: "13-feet-ladder" }]),
      ),
    );

    render(
      <LiveProvider initialSnapshotById={{}} snapshotKey="key_item_dialog_icon" enableSse={false}>
        <ItemDialog
          open={true}
          onOpenChange={() => {}}
          item={null}
          groupId="g1"
          onGroupsChanged={() => {}}
        />
      </LiveProvider>,
    );

    const iconInput = screen.getByRole("combobox", { name: "Icon" });
    fireEvent.change(iconInput, { target: { value: "13 feet" } });

    const option = await screen.findByRole("option", { name: "13 Feet Ladder" });
    fireEvent.click(option);

    expect(iconInput).toHaveValue("13-feet-ladder");
  });

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
        configurationRevision: 0,
        observationUpdatedAt: null,
        lastAttemptAt: null,
        lastSuccessAt: null,
        freshness: "unknown",
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
      configurationRevision: 0,
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
      <LiveProvider
        initialSnapshotById={snapshot}
        snapshotKey="key_item_dialog_preview"
        enableSse={false}
      >
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
      <LiveProvider
        initialSnapshotById={snapshot}
        snapshotKey="key_item_dialog_preview"
        enableSse={false}
      >
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
