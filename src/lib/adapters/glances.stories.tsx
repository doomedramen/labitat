import type { Meta, StoryObj } from "@storybook/react";
import { glancesDefinition } from "./glances";

const meta: Meta<typeof glancesDefinition> = {
  title: "Adapters/Monitoring/Glances",
  component: glancesDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof glancesDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      cpuPercent: 45,
      memPercent: 62,
      memUsed: "8.2 GB",
      swapPercent: 12,
      load1: 2.35,
      uptime: "15 days",
    };
    return glancesDefinition.renderWidget!(data);
  },
};

export const LowUsage: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      cpuPercent: 8,
      memPercent: 25,
      memUsed: "4.0 GB",
      swapPercent: 0,
      load1: 0.45,
      uptime: "45 days",
    };
    return glancesDefinition.renderWidget!(data);
  },
};
