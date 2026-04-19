import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { unifiDefinition } from "./unifi";

const meta: Meta<typeof unifiDefinition> = {
  title: "Adapters/Monitoring/UniFi",
  component: unifiDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof unifiDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      users: 15,
      guests: 3,
      devices: 42,
      sites: 1,
      wanStatus: "up",
      lanUsers: 12,
      wlanUsers: 6,
      gatewayUptime: "15.3 days",
    };
    const payload = unifiDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const NoNetworkHealth: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      users: 8,
      guests: 2,
      devices: 25,
      sites: 1,
    };
    const payload = unifiDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
