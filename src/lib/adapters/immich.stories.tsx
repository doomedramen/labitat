import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { immichDefinition } from "./immich";

const meta: Meta<typeof immichDefinition> = {
  title: "Adapters/Media/Immich",
  component: immichDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof immichDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      users: 5,
      photos: 15000,
      videos: 2500,
      storage: 500000000000,
    };
    const payload = immichDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
