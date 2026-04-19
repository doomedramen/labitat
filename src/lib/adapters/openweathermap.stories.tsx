import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { openweathermapDefinition } from "./openweathermap";

const meta: Meta<typeof openweathermapDefinition> = {
  title: "Adapters/Info/OpenWeatherMap",
  component: openweathermapDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof openweathermapDefinition>;

export const Clear: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      temperature: 22,
      humidity: 65,
      windSpeed: 12,
      description: "clear sky",
      feelsLike: 21,
      unitSymbol: "°C",
      speedUnit: "m/s",
    };
    const payload = openweathermapDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};

export const Rainy: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      temperature: 14,
      humidity: 88,
      windSpeed: 25,
      description: "moderate rain",
      feelsLike: 12,
      unitSymbol: "°C",
      speedUnit: "m/s",
    };
    const payload = openweathermapDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
