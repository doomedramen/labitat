import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { lidarrDefinition } from "./lidarr";

const meta: Meta<typeof lidarrDefinition> = {
  title: "Adapters/Downloads/Lidarr",
  component: lidarrDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof lidarrDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      queued: 5,
      wanted: 12,
      artists: 45,
    };
    const payload = lidarrDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
