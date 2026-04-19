import type { StorybookConfig } from "@storybook/nextjs-vite";
import path from "path";
import { fileURLToPath } from "node:url";

const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

const config: StorybookConfig = {
  stories: ["../src/lib/adapters/**/*.stories.tsx"],
  addons: [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
  ],
  framework: "@storybook/nextjs-vite",
  staticDirs: ["../public"],
  viteFinal: async (config) => {
    config.resolve = {
      ...config.resolve,
      alias: {
        ...config.resolve?.alias,
        "@": path.resolve(dirname, "../src"),
        "@/lib/db": path.resolve(dirname, "../src/lib/db/__mocks__/index.ts"),
        "@/lib/db/schema": path.resolve(dirname, "../src/lib/db/__mocks__/schema.ts"),
        "drizzle-orm/better-sqlite3": path.resolve(
          dirname,
          "../src/lib/db/__mocks__/drizzle-better-sqlite3.ts",
        ),
        "drizzle-orm/sqlite-core": path.resolve(dirname, "../src/lib/db/__mocks__/sqlite-core.ts"),
        "drizzle-orm": path.resolve(dirname, "../src/lib/db/__mocks__/drizzle-orm.ts"),
        "better-sqlite3": path.resolve(dirname, "../src/lib/db/__mocks__/better-sqlite3.ts"),
      },
    };
    return config;
  },
};
export default config;
