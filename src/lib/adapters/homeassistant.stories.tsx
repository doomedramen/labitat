import type { Meta, StoryObj } from "@storybook/react";
import { StatGrid } from "@/components/widgets/stat-card";
import { homeassistantDefinition } from "./homeassistant";

const meta: Meta<typeof homeassistantDefinition> = {
  title: "Adapters/Automation/Home Assistant",
  component: homeassistantDefinition,
  parameters: { layout: "centered" },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof homeassistantDefinition>;

export const Default: Story = {
  render: () => {
    const data = {
      _status: "ok" as const,
      entities: 150,
      sensors: 45,
      lights: 20,
      switches: 15,
    };
    const payload = homeassistantDefinition.toPayload!(data);
    return (
      <div className="w-[400px]">
        <StatGrid stats={payload.stats} />
      </div>
    );
  },
};
