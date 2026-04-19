import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { nginxProxyManagerDefinition } from "./nginx-proxy-manager";

const meta: Meta<typeof nginxProxyManagerDefinition> = {
  title: "Adapters/Networking/Nginx Proxy Manager",
  component: nginxProxyManagerDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof nginxProxyManagerDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      hosts: 12,
      redirHosts: 3,
      streams: 0,
      deadHosts: 2,
    };
    const payload = nginxProxyManagerDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      hosts: 0,
      redirHosts: 0,
      streams: 0,
      deadHosts: 0,
    };
    const payload = nginxProxyManagerDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
