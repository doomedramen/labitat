import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const testDbUrl = `file:${path.resolve(process.cwd(), "data", "labitat.test.db")}`;

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
      "node scripts/clean-test-db.mjs && mkdir -p data && pnpm db:push && pnpm db:seed && pnpm build && npx next start -p 3000",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 300 * 1000,
    env: {
      // Next build/start expect production env; test behavior is driven by explicit vars below.
      NODE_ENV: "production",
      DISABLE_STANDALONE: "1",
      PORT: "3000",
      DATABASE_URL: testDbUrl,
      SECRET_KEY: "test-secret-key-for-e2e-tests-at-least-32-chars!",
      COOKIE_SECURE: "false",
      TEST_SECRET: "e2e-test-reset-token",
    },
  },
});
