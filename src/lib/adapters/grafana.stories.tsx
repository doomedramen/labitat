import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { grafanaDefinition } from "./grafana";

const meta: Meta<typeof grafanaDefinition> = {
  title: "Adapters/Monitoring/Grafana",
  component: grafanaDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof grafanaDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      dashboards: 25,
      datasources: 8,
      totalAlerts: 12,
      alertsTriggered: 2,
    };
    const payload = grafanaDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
