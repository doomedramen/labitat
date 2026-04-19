import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { calibreWebDefinition } from "./calibre-web";

const meta: Meta<typeof calibreWebDefinition> = {
  title: "Adapters/Productivity/Calibre-Web",
  component: calibreWebDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof calibreWebDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      books: 2500,
      authors: 450,
      series: 120,
      formats: 8,
    };
    const payload = calibreWebDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const Empty: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      books: 0,
      authors: 0,
      series: 0,
      formats: 0,
    };
    const payload = calibreWebDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
