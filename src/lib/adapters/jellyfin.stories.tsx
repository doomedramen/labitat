import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { ActiveStreamList } from "@/components/widgets/active-stream";
import { jellyfinDefinition } from "./jellyfin";

const meta: Meta<typeof jellyfinDefinition> = {
  title: "Adapters/Media/Jellyfin",
  component: jellyfinDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof jellyfinDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      activeStreams: 2,
      movies: 650,
      shows: 89,
      episodes: 2100,
      songs: 3200,
      showActiveStreams: true,
      sessions: [
        {
          title: "S01E05 - The Gathering",
          subtitle: "Game of Thrones",
          user: "John",
          progress: 1800,
          duration: 3600,
          state: "playing",
        },
        { title: "Inception", user: "Jane", progress: 5400, duration: 10800, state: "playing" },
      ],
    };
    const payload = jellyfinDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
        {payload.streams && (
          <div className="mt-4">
            <ActiveStreamList items={payload.streams} />
          </div>
        )}
      </div>
    );
  },
};
