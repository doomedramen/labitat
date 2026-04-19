import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { genericPingDefinition } from "./generic-ping";

const meta: Meta<typeof genericPingDefinition> = {
  title: "Adapters/Monitoring/Generic Ping",
  component: genericPingDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof genericPingDefinition>;

export const Online: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      status: "up" as const,
      responseTime: 45,
    };
    const payload = genericPingDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const Offline: Story = {
  render: () => {
    const data = {
      _status: "error" as const,
      _statusText: "Host unreachable",
      status: "down" as const,
      responseTime: 0,
    };
    const payload = genericPingDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
