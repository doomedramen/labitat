import type { Meta, StoryObj } from "@storybook/react";
import { glancesSensorsDefinition } from "./glances-sensors";

const meta: Meta<typeof glancesSensorsDefinition> = {
  title: "Adapters/Monitoring/Glances Sensors",
  component: glancesSensorsDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof glancesSensorsDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      cpuTemp: 55,
      maxTemp: 72,
      fanSpeed: 1800,
    };
    return glancesSensorsDefinition.renderWidget!(data);
  },
};

export const HighTemp: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      cpuTemp: 78,
      maxTemp: 85,
      fanSpeed: 2500,
    };
    return glancesSensorsDefinition.renderWidget!(data);
  },
};
