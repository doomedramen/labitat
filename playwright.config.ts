import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: 1,
  timeout: 45_000,
  maxFailures: 1,
  reporter: "list",
  use: {
    baseURL: "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command:
      "node scripts/clean-test-db.mjs && mkdir -p data && pnpm db:push && pnpm db:seed && pnpm build && pnpm start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 300 * 1000,
    env: {
      NODE_ENV: "test",
      PORT: "3000",
      DATABASE_URL: "file:./data/labitat.test.db",
      SECRET_KEY: "test-secret-key-for-e2e-tests-at-least-32-chars!",
      COOKIE_SECURE: "false",
      TEST_SECRET: "e2e-test-reset-token",
    },
  },
});
