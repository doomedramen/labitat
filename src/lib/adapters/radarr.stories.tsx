import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { DownloadList } from "@/components/widgets/download";
import { radarrDefinition } from "./radarr";

const meta: Meta<typeof radarrDefinition> = {
  title: "Adapters/Downloads/Radarr",
  component: radarrDefinition,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof radarrDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      queued: 5,
      missing: 12,
      wanted: 3,
      movies: 245,
      showActiveDownloads: true,
      enableQueue: true,
      downloads: [
        {
          title: "Dune: Part Two",
          progress: 75,
          timeLeft: "45m",
          activity: "Downloading",
          size: "2.4 GB",
        },
        {
          title: "The Batman",
          progress: 32,
          timeLeft: "1h 20m",
          activity: "Downloading",
          size: "1.8 GB",
        },
      ],
    };

    const payload = radarrDefinition.toPayload!(data);

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

export const NoDownloads: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      queued: 0,
      missing: 0,
      wanted: 0,
      movies: 150,
    };

    const payload = radarrDefinition.toPayload!(data);

    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const WithWarnings: Story = {
  render: () => {
    const data = {
      _status: "warn" as const,
      _statusText: "High number of missing movies",
      queued: 2,
      missing: 45,
      wanted: 12,
      movies: 300,
    };

    const payload = radarrDefinition.toPayload!(data);

    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
