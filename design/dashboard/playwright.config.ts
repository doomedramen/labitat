import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./tests",
  outputDir: "./test-results",
  fullyParallel: true,
  workers: 2,
  reporter: [["list"], ["html", { outputFolder: "./playwright-report", open: "never" }]],
  use: { baseURL: "http://127.0.0.1:5173", trace: "retain-on-failure", video: "on" },
  webServer: {
    command: "node ../../node_modules/vite/bin/vite.js --config vite.config.ts",
    url: "http://127.0.0.1:5173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
