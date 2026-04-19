import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { jackettDefinition } from "./jackett";

const meta: Meta<typeof jackettDefinition> = {
  title: "Adapters/Downloads/Jackett",
  component: jackettDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof jackettDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      configured: 15,
      errored: 2,
    };
    const payload = jackettDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
