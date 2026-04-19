import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { ActiveStreamList } from "@/components/widgets/active-stream";
import { tautulliDefinition } from "./tautulli";

const meta: Meta<typeof tautulliDefinition> = {
  title: "Adapters/Media/Tautulli",
  component: tautulliDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof tautulliDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      streamCount: 3,
      totalBandwidth: "150 MB/s",
      transcodeStreams: 1,
      directPlayStreams: 1,
      directStreamStreams: 1,
      sessions: [
        {
          title: "Breaking Bad",
          subtitle: "Season 4",
          user: "John",
          progress: 1800,
          duration: 2700,
          state: "playing",
        },
        {
          title: "Oppenheimer",
          user: "Jane",
          progress: 5400,
          duration: 10800,
          state: "playing",
          transcoding: { isDirect: false, hardwareDecoding: true, hardwareEncoding: false },
        },
      ],
    };
    const payload = tautulliDefinition.toPayload!(data);
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

export const Idle: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      streamCount: 0,
      totalBandwidth: "0 B/s",
      transcodeStreams: 0,
      directPlayStreams: 0,
      directStreamStreams: 0,
    };
    const payload = tautulliDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
