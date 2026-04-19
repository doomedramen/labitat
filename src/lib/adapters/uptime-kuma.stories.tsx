import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { uptimeKumaDefinition } from "./uptime-kuma";

const meta: Meta<typeof uptimeKumaDefinition> = {
  title: "Adapters/Monitoring/Uptime Kuma",
  component: uptimeKumaDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof uptimeKumaDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      up: 8,
      down: 1,
      uptime: "99.5%",
    };
    const payload = uptimeKumaDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const WithIncident: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      up: 7,
      down: 2,
      uptime: "97.2%",
      incident: {
        title: "Database outage",
        createdDate: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        hoursAgo: 2,
      },
    };
    const payload = uptimeKumaDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
