import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { traefikDefinition } from "./traefik";

const meta: Meta<typeof traefikDefinition> = {
  title: "Adapters/Networking/Traefik",
  component: traefikDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof traefikDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      routers: 15,
      services: 12,
      middlewares: 8,
    };
    const payload = traefikDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
