import type { Meta, StoryObj } from "@storybook/react";
import { pipesDefinition } from "./pipes";

const meta: Meta<typeof pipesDefinition> = {
  title: "Adapters/Info/Pipes",
  component: pipesDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof pipesDefinition>;

export const Default: Story = {
  render: () => {
    return pipesDefinition.renderWidget!({ _status: "ok" });
  },
};
