import type { Meta, StoryObj } from "@storybook/react";
import { searchDefinition } from "./search";

const meta: Meta<typeof searchDefinition> = {
  title: "Adapters/Info/Search",
  component: searchDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof searchDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      engines: "Google, DuckDuckGo, Bing",
    };
    return searchDefinition.renderWidget!(data);
  },
};

export const CustomEngines: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      engines: "GitHub, StackOverflow, YouTube",
    };
    return searchDefinition.renderWidget!(data);
  },
};
