import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { apcupsDefinition } from "./apcups";

const meta: Meta<typeof apcupsDefinition> = {
  title: "Adapters/Monitoring/APC UPS",
  component: apcupsDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof apcupsDefinition>;

export const Online: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      loadPercent: 35,
      batteryCharge: 85,
      timeLeft: 3600,
      temperature: 32,
      status: "ONLINE",
    };
    const payload = apcupsDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const OnBattery: Story = {
  render: () => {
    const data = {
      _status: "warn" as const,
      _statusText: "UPS Status: On Battery",
      loadPercent: 60,
      batteryCharge: 45,
      timeLeft: 1800,
      temperature: 35,
      status: "On Battery",
    };
    const payload = apcupsDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
