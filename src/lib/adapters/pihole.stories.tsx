import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { piholeDefinition } from "./pihole";

const meta: Meta<typeof piholeDefinition> = {
  title: "Adapters/Networking/Pi-hole",
  component: piholeDefinition,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
};

export default meta;

type Story = StoryObj<typeof piholeDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      queries: 10000,
      blocked: 2500,
      percentBlocked: "25%",
      domainsBlocked: 150000,
    };

    const payload = piholeDefinition.toPayload!(data);

    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const ZeroValues: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      queries: 0,
      blocked: 0,
      percentBlocked: "0%",
      domainsBlocked: 0,
    };

    const payload = piholeDefinition.toPayload!(data);

    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
