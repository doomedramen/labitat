import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { bazarrDefinition } from "./bazarr";

const meta: Meta<typeof bazarrDefinition> = {
  title: "Adapters/Downloads/Bazarr",
  component: bazarrDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof bazarrDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      missingMovies: 8,
      missingEpisodes: 23,
    };
    const payload = bazarrDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const NoMissing: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      missingMovies: 0,
      missingEpisodes: 0,
    };
    const payload = bazarrDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
