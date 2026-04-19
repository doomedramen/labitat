import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "node:url";
const dirname =
  typeof __dirname !== "undefined" ? __dirname : path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  test: {
    coverage: {
      provider: "v8",
      reporter: ["text-summary", "json", "html", "lcov"],
      reportsDirectory: "./coverage",
      include: [
        "lib/**/*.{ts,tsx}",
        "components/**/*.{ts,tsx}",
        "actions/**/*.{ts,tsx}",
        "hooks/**/*.{ts,tsx}",
      ],
      exclude: [
        "**/*.test.{ts,tsx}",
        "**/*.d.ts",
        "**/node_modules/**",
        "**/.next/**",
        "coverage/**",
        "components/ui/**", // shadcn components (third-party UI library)
        "**/*.stories.tsx", // Storybook stories
      ],
      thresholds: {
        lines: 70,
        functions: 60,
        branches: 60,
        statements: 70,
      },
    },
    projects: [
      {
        extends: true,
        test: {
          globals: true,
          environment: "jsdom",
          include: ["**/*.test.{ts,tsx}"],
          exclude: [
            "**/node_modules/**",
            "**/tests/**",
            // E2E tests are separate
            "**/.next/**",
            "**/*.stories.tsx", // Storybook stories
          ],
          setupFiles: ["./tests/unit-setup.ts"],
        },
      },
    ],
  },
});
