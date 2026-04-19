import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { readarrDefinition } from "./readarr";

const meta: Meta<typeof readarrDefinition> = {
  title: "Adapters/Downloads/Readarr",
  component: readarrDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof readarrDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      queued: 3,
      wanted: 8,
      books: 120,
    };
    const payload = readarrDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
