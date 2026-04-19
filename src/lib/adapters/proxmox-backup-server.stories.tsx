import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { proxmoxBackupServerDefinition } from "./proxmox-backup-server";

const meta: Meta<typeof proxmoxBackupServerDefinition> = {
  title: "Adapters/Storage/Proxmox Backup Server",
  component: proxmoxBackupServerDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof proxmoxBackupServerDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      datastores: 2,
      snapshots: 150,
      usedSpace: "8 TB",
      totalSpace: "12 TB",
      usagePercent: 66.7,
      cpuUsage: 35.0,
      memoryUsage: 45.2,
      memoryUsed: "4.5 GB",
      memoryTotal: "16 GB",
      failedTasks: 2,
    };
    const payload = proxmoxBackupServerDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const NoFailures: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      datastores: 1,
      snapshots: 50,
      usedSpace: "2 TB",
      totalSpace: "10 TB",
      usagePercent: 20.0,
      cpuUsage: 10.0,
      memoryUsage: 25.0,
      memoryUsed: "4 GB",
      memoryTotal: "16 GB",
      failedTasks: 0,
    };
    const payload = proxmoxBackupServerDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
