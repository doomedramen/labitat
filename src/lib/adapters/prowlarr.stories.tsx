import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { prowlarrDefinition } from "./prowlarr";

const meta: Meta<typeof prowlarrDefinition> = {
  title: "Adapters/Downloads/Prowlarr",
  component: prowlarrDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof prowlarrDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      queries: 1250,
      grabs: 89,
      indexers: 12,
    };
    const payload = prowlarrDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
