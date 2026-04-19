import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { unmanicDefinition } from "./unmanic";

const meta: Meta<typeof unmanicDefinition> = {
  title: "Adapters/Media/Unmanic",
  component: unmanicDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof unmanicDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      activeWorkers: 2,
      totalWorkers: 4,
      queuedItems: 8,
      completedToday: 5,
      totalCompleted: 150,
    };
    const payload = unmanicDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const Idle: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      activeWorkers: 0,
      totalWorkers: 4,
      queuedItems: 0,
      completedToday: 0,
      totalCompleted: 100,
    };
    const payload = unmanicDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
