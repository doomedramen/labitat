import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { openmeteoDefinition } from "./openmeteo";

const meta: Meta<typeof openmeteoDefinition> = {
  title: "Adapters/Info/Open-Meteo",
  component: openmeteoDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof openmeteoDefinition>;

export const ClearDay: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      temperature: 22,
      humidity: 65,
      windSpeed: 12,
      weatherCode: 0,
      isDay: true,
    };
    const payload = openmeteoDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const RainyNight: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      temperature: 14,
      humidity: 88,
      windSpeed: 25,
      weatherCode: 63,
      isDay: false,
    };
    const payload = openmeteoDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
