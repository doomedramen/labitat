import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { seerrDefinition } from "./seerr";

const meta: Meta<typeof seerrDefinition> = {
  title: "Adapters/Media/Overseerr",
  component: seerrDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof seerrDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      pending: 5,
      approved: 12,
      available: 45,
      processing: 2,
    };
    const payload = seerrDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const NoRequests: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      pending: 0,
      approved: 0,
      available: 0,
      processing: 0,
    };
    const payload = seerrDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
