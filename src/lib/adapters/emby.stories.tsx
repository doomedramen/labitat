import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { ActiveStreamList } from "@/components/widgets/active-stream";
import { embyDefinition } from "./emby";

const meta: Meta<typeof embyDefinition> = {
  title: "Adapters/Media/Emby",
  component: embyDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof embyDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      activeStreams: 2,
      movies: 850,
      shows: 120,
      episodes: 3400,
      songs: 5000,
      showActiveStreams: true,
      sessions: [
        {
          title: "Breaking Bad",
          subtitle: "Season 4",
          user: "John",
          progress: 1800,
          duration: 2700,
          state: "playing",
        },
        { title: "Oppenheimer", user: "Jane", progress: 5400, duration: 10800, state: "playing" },
      ],
    };
    const payload = embyDefinition.toPayload!(data);
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

export const LibraryOnly: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      activeStreams: 0,
      movies: 850,
      shows: 120,
      episodes: 3400,
      songs: 5000,
    };
    const payload = embyDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
