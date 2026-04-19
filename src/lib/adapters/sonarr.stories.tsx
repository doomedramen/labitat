import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { DownloadList } from "@/components/widgets/download";
import { sonarrDefinition } from "./sonarr";

const meta: Meta<typeof sonarrDefinition> = {
  title: "Adapters/Downloads/Sonarr",
  component: sonarrDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof sonarrDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      queued: 8,
      missing: 3,
      wanted: 1,
      series: 89,
      showActiveDownloads: true,
      enableQueue: true,
      downloads: [
        {
          title: "S01E05 - The Gathering Storm",
          subtitle: "Game of Thrones",
          progress: 60,
          timeLeft: "30m",
          activity: "Downloading",
          size: "1.2 GB",
        },
        {
          title: "S02E12 - Final Victory",
          subtitle: "Breaking Bad",
          progress: 95,
          timeLeft: "5m",
          activity: "Downloading",
          size: "800 MB",
        },
      ],
    };
    const payload = sonarrDefinition.toPayload!(data);
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
      series: 45,
    };
    const payload = sonarrDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
