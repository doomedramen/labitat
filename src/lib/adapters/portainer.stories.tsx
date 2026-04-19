import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { portainerDefinition } from "./portainer";

const meta: Meta<typeof portainerDefinition> = {
  title: "Adapters/Monitoring/Portainer",
  component: portainerDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof portainerDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      running: 8,
      stopped: 3,
      total: 15,
    };
    const payload = portainerDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
