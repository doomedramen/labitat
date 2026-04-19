import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { DownloadList } from "@/components/widgets/download";
import { qbittorrentDefinition } from "./qbittorrent";

const meta: Meta<typeof qbittorrentDefinition> = {
  title: "Adapters/Downloads/qBittorrent",
  component: qbittorrentDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof qbittorrentDefinition>;

export const Downloading: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      downSpeed: "15.2 MB/s",
      upSpeed: "1.8 MB/s",
      activeDownloads: 3,
      queued: 12,
      showDownloads: true,
      downloads: [
        {
          title: "Ubuntu-22.04.iso",
          progress: 75,
          timeLeft: "45m",
          activity: "Downloading",
          size: "4.2 GB",
        },
        {
          title: "movie.mp4",
          progress: 32,
          timeLeft: "1h 30m",
          activity: "Downloading",
          size: "1.8 GB",
        },
      ],
    };
    const payload = qbittorrentDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
        {payload.downloads && (
          <div className="mt-4">
            <DownloadList items={payload.downloads} />
          </div>
        )}
      </div>
    );
  },
};

export const Idle: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      downSpeed: "0 B/s",
      upSpeed: "0 B/s",
      activeDownloads: 0,
      queued: 5,
    };
    const payload = qbittorrentDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
