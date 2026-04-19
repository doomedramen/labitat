import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { genericRestDefinition } from "./generic-rest";

const meta: Meta<typeof genericRestDefinition> = {
  title: "Adapters/Monitoring/Generic REST",
  component: genericRestDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof genericRestDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      value: "operational",
      label: "Status",
    };
    const payload = genericRestDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const Error: Story = {
  render: () => {
    const data = {
      _status: "error" as const,
      _statusText: "Connection refused",
      value: "Error",
      label: "Status",
    };
    const payload = genericRestDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
