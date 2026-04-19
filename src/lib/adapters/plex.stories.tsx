import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { ActiveStreamList } from "@/components/widgets/active-stream";
import { plexDefinition } from "./plex";

const meta: Meta<typeof plexDefinition> = {
  title: "Adapters/Media/Plex",
  component: plexDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof plexDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      streams: 2,
      albums: 120,
      movies: 450,
      tvShows: 89,
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
        {
          title: "Dune: Part Two",
          user: "Jane",
          progress: 5400,
          duration: 10800,
          state: "playing",
          transcoding: { isDirect: true },
        },
      ],
    };
    const payload = plexDefinition.toPayload!(data);
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
      streams: 0,
      albums: 120,
      movies: 450,
      tvShows: 89,
    };
    const payload = plexDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
