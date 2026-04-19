import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { DownloadList } from "@/components/widgets/download";
import { sabnzbdDefinition } from "./sabnzbd";

const meta: Meta<typeof sabnzbdDefinition> = {
  title: "Adapters/Downloads/SABnzbd",
  component: sabnzbdDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof sabnzbdDefinition>;

export const Downloading: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      speed: "15.2 MB/s",
      remaining: "2:15:00",
      queueSize: 8,
      downloading: true,
      showDownloads: true,
      downloads: [
        {
          title: "movie.mkv",
          progress: 75,
          timeLeft: "45m",
          activity: "downloading",
          size: "2.4 GB",
        },
        {
          title: "series_episode.mkv",
          progress: 32,
          timeLeft: "1h 30m",
          activity: "downloading",
          size: "800 MB",
        },
      ],
    };
    const payload = sabnzbdDefinition.toPayload!(data);
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
      speed: "0 B/s",
      remaining: "—",
      queueSize: 0,
      downloading: false,
    };
    const payload = sabnzbdDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
