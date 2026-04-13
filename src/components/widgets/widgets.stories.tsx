import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import {
  StatGrid,
  ResourceBar,
  ResourceBarDual,
  DownloadList,
  ActiveStreamList,
  ListItem,
} from "./index";
import { Download, AlertTriangle, Search, Film, HardDrive, Monitor } from "lucide-react";

const meta: Meta = {
  title: "Widgets/Core",
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;

/**
 * StatGrid - used for high-level metrics (e.g., Radarr/Sonarr totals)
 */
export const Stats: StoryObj<typeof StatGrid> = {
  args: {
    items: [
      { id: "movies", value: 1240, label: "Movies", icon: Film },
      {
        id: "missing",
        value: 12,
        label: "Missing",
        icon: AlertTriangle,
        valueClassName: "text-amber-500",
      },
      { id: "wanted", value: 5, label: "Wanted", icon: Search },
      { id: "quality", value: "98%", label: "HD", icon: Monitor },
    ],
    displayMode: "label",
  },
  render: (args) => (
    <div className="w-[300px]">
      <StatGrid {...args} />
    </div>
  ),
};

/**
 * ResourceBar - used for single metrics like CPU or Memory
 */
export const Resources: StoryObj<typeof ResourceBar> = {
  args: {
    label: "CPU Usage",
    value: 45,
    hint: "4 cores",
  },
  render: (args) => (
    <div className="flex w-[300px] flex-col gap-4">
      <ResourceBar {...args} />
      <ResourceBar label="Memory" value={75} hint="12.4 GB / 16 GB" warningAt={70} />
      <ResourceBar label="Disk Space" value={92} hint="Critical" criticalAt={90} />
    </div>
  ),
};

/**
 * ResourceBarDual - used for Used vs Free metrics
 */
export const ResourcesDual: StoryObj<typeof ResourceBarDual> = {
  args: {
    label: "Memory",
    used: 68,
    total: "16.0 GB",
    free: "5.1 GB",
  },
  render: (args) => (
    <div className="w-[300px]">
      <ResourceBarDual {...args} />
    </div>
  ),
};

/**
 * DownloadList - used by Sonarr, Radarr, qBittorrent, etc.
 */
export const Downloads: StoryObj<typeof DownloadList> = {
  args: {
    downloads: [
      {
        title: "Gladiator II (2024)",
        progress: 65.5,
        timeLeft: "12m",
        activity: "Downloading",
        size: "12.4 GB",
      },
      {
        title: "The Bear - S03E01",
        progress: 100,
        activity: "Importing",
        size: "2.1 GB",
      },
      {
        title: "Dune: Part Two",
        progress: 15,
        timeLeft: "2h 45m",
        activity: "Queued",
        size: "45.0 GB",
      },
    ],
  },
  render: (args) => (
    <div className="w-[400px]">
      <DownloadList {...args} />
    </div>
  ),
};

/**
 * ActiveStreamList - used by Plex, Tautulli, Jellyfin
 */
export const ActiveStreams: StoryObj<typeof ActiveStreamList> = {
  args: {
    streams: [
      {
        title: "Dune: Part Two",
        user: "Martin",
        progress: 3600,
        duration: 9900,
        state: "playing",
        transcoding: { isDirect: true },
      },
      {
        title: "The Bear",
        subtitle: "S03E01 - Tomorrow",
        user: "Sarah",
        progress: 600,
        duration: 1800,
        state: "paused",
        transcoding: {
          isDirect: false,
          hardwareDecoding: true,
          hardwareEncoding: true,
        },
      },
    ],
  },
  render: (args) => (
    <div className="w-[400px]">
      <ActiveStreamList {...args} />
    </div>
  ),
};

/**
 * Generic ListItem examples
 */
export const GenericItems: StoryObj<typeof ListItem> = {
  render: () => (
    <div className="flex w-[400px] flex-col gap-2">
      <ListItem
        title="System Update Available"
        subtitle="v1.2.3"
        leading={Download}
        className="bg-amber-500/10"
      />
      <ListItem
        title="Disk /mnt/storage"
        progress={85}
        trailing={[{ icon: HardDrive, text: "1.2 TB free" }]}
      />
      <ListItem
        title="High Temperature Alert"
        subtitle="CPU"
        leading={AlertTriangle}
        className="bg-destructive/10 text-destructive"
        trailing={[{ text: "85°C" }]}
      />
    </div>
  ),
};
