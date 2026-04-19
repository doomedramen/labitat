import React from "react";
import type { Preview } from "@storybook/nextjs-vite";
import { PALETTES } from "../src/lib/palettes";
import "../src/app/globals.css";

const preview: Preview = {
  globalTypes: {
    theme: {
      description: "Global theme mode",
      defaultValue: "system",
      toolbar: {
        title: "Theme",
        icon: "circlehollow",
        items: ["light", "dark", "system"],
      },
    },
    palette: {
      description: "Color palette",
      defaultValue: "default",
      toolbar: {
        title: "Palette",
        icon: "paintbrush",
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
      const theme = context.globals.theme ?? "system";
      const palette = context.globals.palette ?? "default";

      const isDark =
        theme === "dark" ||
        (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);

      const dataTheme = theme === "system" ? (isDark ? "dark" : "light") : theme;

      return (
        <div data-palette={palette} className={dataTheme === "dark" ? "dark" : ""}>
          <Story />
        </div>
      );
    },
  ],
};

export default preview;
