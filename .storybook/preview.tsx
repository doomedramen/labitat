import React from "react";
import type { Preview } from "@storybook/nextjs-vite";
import { PALETTES } from "../src/lib/palettes";
import "../src/app/globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";

const preview: Preview = {
  globalTypes: {
    palette: {
      description: "Color palette",
      defaultValue: "nord",
      toolbar: {
        title: "Palette",
        icon: "paintlang",
        items: PALETTES.map((p) => p.id),
      },
    },
  },

  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },

    a11y: {
      test: "todo",
    },
  },

  decorators: [
    (Story, context) => {
      const palette = context.globals.palette ?? "nord";

      return (
        <div data-palette={palette}>
          <TooltipProvider>
            <Story />
          </TooltipProvider>
        </div>
      );
    },
  ],
};

export default preview;
