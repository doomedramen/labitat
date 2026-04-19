import type { Meta, StoryObj } from "@storybook/react";
import { glancesDiskUsageDefinition } from "./glances-diskusage";

const meta: Meta<typeof glancesDiskUsageDefinition> = {
  title: "Adapters/Monitoring/Glances Disk Usage",
  component: glancesDiskUsageDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof glancesDiskUsageDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      usedPercent: 65,
      used: "450 GB",
      total: "1 TB",
      free: "550 GB",
    };
    return glancesDiskUsageDefinition.renderWidget!(data);
  },
};

export const Empty: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      usedPercent: 15,
      used: "150 GB",
      total: "1 TB",
      free: "850 GB",
    };
    return glancesDiskUsageDefinition.renderWidget!(data);
  },
};
