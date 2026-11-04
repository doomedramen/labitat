import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, expect, it, vi } from "vitest";
import type { ItemLive } from "@/lib/live-types";
import type { ItemRow } from "@/lib/types";

const state = vi.hoisted(() => ({ live: {} as Record<string, ItemLive>, now: 1_000_000 }));
vi.mock("@/components/dashboard/use-item-live", () => ({
  useItemLive: (id: string) => state.live[id] ?? null,
}));
vi.mock("@/hooks/use-visible-clock", () => ({ useVisibleClock: () => state.now }));
import { LiveActivity } from "./live-activity";

function item(id: string, serviceType: string): ItemRow {
  return {
    id,
    groupId: "g",
    label: id,
    href: null,
    serviceType,
    serviceUrl: null,
    iconUrl: null,
    configEnc: null,
    configurationRevision: 0,
    pollingMs: 30000,
    order: 0,
    displayMode: "label",
    statDisplayMode: "label",
    statCardOrder: null,
    createdAt: null,
  };
}
function live(
  widgetData: ItemLive["widgetData"],
  freshness: ItemLive["freshness"] = "fresh",
): ItemLive {
  return {
    widgetData,
    pingStatus: null,
    configurationRevision: 0,
    observationUpdatedAt: state.now,
    lastSuccessAt: state.now,
    lastAttemptAt: state.now,
    lastFetchedAt: state.now,
    itemLastUpdateAt: state.now,
    freshness,
  };
}
const items = [item("Client", "qbittorrent"), item("Plex", "plex")];
beforeEach(() => {
  state.live = {};
});
it("shows available activity with its source, expands bounded results and opens the source", async () => {
  state.live.Client = live({
    _status: "ok",
    showDownloads: true,
    downloads: Array.from({ length: 5 }, (_, n) => ({
      title: `Download ${n}`,
      progress: n * 20,
      activity: "downloading",
    })),
  });
  state.live.Plex = live({
    _status: "ok",
    showActiveStreams: true,
    streams: 1,
    albums: 0,
    movies: 0,
    tvShows: 0,
    sessions: [{ title: "A film", user: "Alex", progress: 60, duration: 120, state: "paused" }],
  });
  const open = vi.fn();
  render(<LiveActivity items={items} initialNow={state.now} onDetails={open} />);
  expect(await screen.findByText("Download 0")).toBeVisible();
  expect(screen.queryByText("Download 3")).toBeNull();
  expect(screen.getByText(/Plex · Alex · paused · 1:00 \/ 2:00/)).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Show 2 more" }));
  expect(screen.getByText("Download 4")).toBeVisible();
  fireEvent.click(screen.getByRole("button", { name: "Inspect Plex: A film" }));
  expect(open).toHaveBeenCalledWith("Plex");
});
it("does not present stale or disabled activity as current", async () => {
  state.live.Client = live(
    { _status: "ok", showDownloads: true, downloads: [{ title: "Old download", progress: 20 }] },
    "stale",
  );
  state.live.Plex = live({
    _status: "ok",
    showActiveStreams: false,
    streams: 1,
    albums: 0,
    movies: 0,
    tvShows: 0,
    sessions: [{ title: "Private stream", user: "Alex", progress: 5, duration: 10 }],
  });
  render(<LiveActivity items={items} initialNow={state.now} onDetails={vi.fn()} />);
  expect(await screen.findByText(/Client · Saved data/)).toBeVisible();
  expect(screen.queryByText("Old download")).toBeNull();
  expect(screen.queryByText("Private stream")).toBeNull();
  expect(
    within(screen.getByRole("region", { name: "Active streams" })).getByText("No activity to show"),
  ).toBeVisible();
});

it("does not invent progress for a download without a measurement", async () => {
  state.live.Client = live({
    _status: "ok",
    showDownloads: true,
    downloads: [{ title: "Waiting", activity: "Queued" }],
  });
  render(<LiveActivity items={[items[0]]} initialNow={state.now} onDetails={vi.fn()} />);
  const entry = await screen.findByRole("button", { name: "Inspect Client: Waiting" });
  expect(within(entry).queryByRole("progressbar")).toBeNull();
});
