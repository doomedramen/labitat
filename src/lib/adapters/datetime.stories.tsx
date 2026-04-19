import type { Meta, StoryObj } from "@storybook/react";
import { datetimeDefinition } from "./datetime";

const meta: Meta<typeof datetimeDefinition> = {
  title: "Adapters/Info/DateTime",
  component: datetimeDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof datetimeDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      time: "14:32:45",
      date: "Saturday, April 19, 2025",
      timeZone: "EST",
      timeZoneOffset: "-5",
    };
    return datetimeDefinition.renderWidget!(data);
  },
};

export const Midnight: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      time: "00:00:00",
      date: "Sunday, April 20, 2025",
      timeZone: "GMT",
      timeZoneOffset: "+0",
    };
    return datetimeDefinition.renderWidget!(data);
  },
};
