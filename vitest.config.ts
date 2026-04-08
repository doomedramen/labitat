import { defineConfig } from "vitest/config"
import path from "path"

export default defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    include: ["**/*.test.{ts,tsx}"],
    exclude: [
      "**/node_modules/**",
      "**/tests/**", // E2E tests are separate
      "**/.next/**",
    ],
    setupFiles: ["./tests/unit-setup.ts"],
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
      ],
      thresholds: {
        // Baseline: 27.86% statements, 52.76% branches, 31.21% functions
        // These thresholds will be increased as we add more tests
        lines: 27,
        functions: 30,
        branches: 50,
        statements: 27,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
})
