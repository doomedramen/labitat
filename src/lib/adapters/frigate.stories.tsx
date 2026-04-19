import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { frigateDefinition } from "./frigate";

const meta: Meta<typeof frigateDefinition> = {
  title: "Adapters/Monitoring/Frigate",
  component: frigateDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof frigateDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      cameras: 4,
      uptime: 864000,
      version: "0.14.0",
    };
    const payload = frigateDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
