import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { ItemCard } from "@/components/dashboard/item/item-card";
import { LiveProvider } from "@/components/dashboard/live-provider";
import type { ItemRow } from "@/lib/types";
import type { ItemLive } from "@/lib/live-types";
import type { ServiceData } from "./types";

const fixtures: {
  label: string;
  service: string;
  data: ServiceData | null;
  order?: string[];
  cached?: boolean;
}[] = [
  {
    label: "Proxmox",
    service: "proxmox",
    order: ["cpu", "nodes", "vms", "lxcs"],
    data: {
      _status: "ok",
      nodes: 3,
      vms: 14,
      runningVMs: 12,
      containers: 9,
      runningContainers: 9,
      cpuUsage: 31.7,
      memoryUsage: 62,
    },
  },
  {
    label: "AdGuard Home",
    service: "adguard",
    order: ["queries", "blocked", "rate", "latency"],
    data: { _status: "ok", queries: 184392, blocked: 28473, blockedPercent: 15.4, latency: 12 },
  },
  {
    label: "Plex",
    service: "plex",
    data: {
      _status: "ok",
      streams: 2,
      albums: 1284,
      movies: 642,
      tvShows: 89,
      showActiveStreams: true,
      sessions: [
        {
          title: "Hello, Ms. Cobel",
          subtitle: "Severance",
          user: "Alex",
          progress: 1500,
          duration: 3000,
          state: "playing",
        },
      ],
    },
  },
  {
    label: "Sonarr",
    service: "sonarr",
    data: {
      _status: "ok",
      queued: 3,
      missing: 1,
      wanted: 4,
      series: 187,
      enableQueue: true,
      showActiveDownloads: true,
      downloads: [
        {
          title: "Foundation · S02E01",
          progress: 64,
          timeLeft: "11m",
          size: "3.4 GB",
          activity: "Downloading",
        },
      ],
    },
  },
  {
    label: "Backup server",
    service: "proxmox",
    data: {
      _status: "error",
      _statusText: "Connection timed out. Check that the service is running and reachable.",
    },
  },
  {
    label: "Media archive",
    service: "plex",
    cached: true,
    data: { _status: "ok", streams: 0, albums: 806, movies: 2418, tvShows: 156 },
  },
];
const items: ItemRow[] = fixtures.map((fixture, index) => ({
  id: `design-${index}`,
  groupId: "design",
  label: fixture.label,
  serviceType: fixture.service,
  href: "https://example.com",
  iconUrl: null,
  serviceUrl: null,
  configEnc: null,
  configurationRevision: 0,
  order: index,
  pollingMs: 15000,
  displayMode: "label",
  statDisplayMode: "label",
  createdAt: null,
  statCardOrder: fixture.order
    ? JSON.stringify({
        active: fixture.order,
        unused: fixture.service === "proxmox" ? ["memory"] : ["parental", "safe"],
      })
    : null,
}));
const now = Date.now();
const snapshots: Record<string, ItemLive> = Object.fromEntries(
  items.map((item, index) => [
    item.id,
    {
      widgetData: fixtures[index].data,
      pingStatus: null,
      configurationRevision: 0,
      observationUpdatedAt: now,
      lastAttemptAt: now,
      lastSuccessAt: now,
      freshness: fixtures[index].cached ? "stale" : "fresh",
      lastFetchedAt: now - (fixtures[index].cached ? 180000 : 1000),
      itemLastUpdateAt: fixtures[index].cached ? null : now,
    },
  ]),
);

function Preview() {
  const [palette, setPalette] = useState("nord");
  return (
    <div
      data-palette={palette}
      className="min-h-screen bg-background text-foreground px-5 py-10 sm:p-12"
    >
      <div className="mx-auto max-w-[1160px]">
        <header className="mb-10 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-[10px] font-semibold uppercase tracking-[.22em] text-primary">
              Labitat / Your personal infrastructure
            </p>
            <h1 className="text-4xl font-medium tracking-[-.045em]">A little more connected.</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Your services, at a glance. All sample data.
            </p>
          </div>
          <label className="text-xs text-muted-foreground">
            Theme{" "}
            <select
              aria-label="Preview theme"
              value={palette}
              onChange={(event) => setPalette(event.target.value)}
              className="ml-2 rounded-lg border border-border bg-card px-3 py-2 text-foreground"
            >
              <option value="nord">Nord</option>
              <option value="dark">Graphite</option>
              <option value="light">Light</option>
              <option value="rose_pine">Rosé Pine</option>
            </select>
          </label>
        </header>
        <LiveProvider
          initialSnapshotById={snapshots}
          snapshotKey="service-card-design"
          enableSse={false}
        >
          <div className="grid items-start gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <ItemCard key={item.id} item={item} />
            ))}
          </div>
        </LiveProvider>
        <p className="mt-8 text-xs text-muted-foreground">
          Service card study · Open a service from its header. Expand status details for connection
          information.
        </p>
      </div>
    </div>
  );
}
const meta: Meta<typeof Preview> = {
  title: "Dashboard/Service cards",
  component: Preview,
  parameters: { layout: "fullscreen" },
};
export default meta;
export const Overview: StoryObj<typeof Preview> = {};
