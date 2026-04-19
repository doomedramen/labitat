import type { Meta, StoryObj } from "@storybook/react";
import { matrixDefinition } from "./matrix";

const meta: Meta<typeof matrixDefinition> = {
  title: "Adapters/Info/Matrix Rain",
  component: matrixDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof matrixDefinition>;

export const Default: Story = {
  render: () => {
    return matrixDefinition.renderWidget!({ _status: "ok" });
  },
};
