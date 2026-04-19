import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { proxmoxDefinition } from "./proxmox";

const meta: Meta<typeof proxmoxDefinition> = {
  title: "Adapters/Monitoring/Proxmox",
  component: proxmoxDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof proxmoxDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      nodes: 3,
      vms: 15,
      containers: 25,
      runningVMs: 10,
      runningContainers: 20,
      cpuUsage: 45.5,
      memoryUsage: 62.3,
      memoryUsed: "32 GB",
      memoryTotal: "64 GB",
    };
    const payload = proxmoxDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const LowUsage: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      nodes: 1,
      vms: 5,
      containers: 10,
      runningVMs: 2,
      runningContainers: 5,
      cpuUsage: 12.0,
      memoryUsage: 25.0,
      memoryUsed: "8 GB",
      memoryTotal: "32 GB",
    };
    const payload = proxmoxDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
