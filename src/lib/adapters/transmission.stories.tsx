import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { DownloadList } from "@/components/widgets/download";
import { transmissionDefinition } from "./transmission";

const meta: Meta<typeof transmissionDefinition> = {
  title: "Adapters/Downloads/Transmission",
  component: transmissionDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof transmissionDefinition>;

export const Downloading: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      leech: 3,
      download: 15000000,
      seed: 5,
      upload: 2000000,
      showDownloads: true,
      downloads: [
        {
          title: "Ubuntu-22.04.iso",
          progress: 75,
          timeLeft: "45m",
          activity: "downloading",
          size: "4.2 GB",
        },
        {
          title: "movie.mp4",
          progress: 32,
          timeLeft: "1h 30m",
          activity: "downloading",
          size: "1.8 GB",
        },
      ],
    };
    const payload = transmissionDefinition.toPayload!(data);
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

export const SeedingOnly: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      leech: 0,
      download: 0,
      seed: 10,
      upload: 500000,
    };
    const payload = transmissionDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
