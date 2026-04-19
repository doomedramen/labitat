import type { Meta, StoryObj } from "@storybook/react";
import { glancesPerCpuDefinition } from "./glances-percpu";

const meta: Meta<typeof glancesPerCpuDefinition> = {
  title: "Adapters/Monitoring/Glances Per-CPU",
  component: glancesPerCpuDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof glancesPerCpuDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      cores: 8,
      maxCore: 85,
      avgCpu: 45,
      coreUsages: [42, 65, 38, 85, 22, 55, 18, 45],
    };
    return glancesPerCpuDefinition.renderWidget!(data);
  },
};

export const LowUsage: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      cores: 4,
      maxCore: 25,
      avgCpu: 12,
      coreUsages: [8, 12, 15, 10],
    };
    return glancesPerCpuDefinition.renderWidget!(data);
  },
};
