import { defineConfig, devices } from "@playwright/test";
import path from "node:path";

const testDbUrl = `file:${path.resolve(process.cwd(), "data", "labitat.test.db")}`;
const e2ePort = Number.parseInt(process.env.LABITAT_E2E_PORT ?? "3100", 10);
const e2eMode = process.env.LABITAT_E2E_MODE ?? "production";

if (!Number.isInteger(e2ePort) || e2ePort < 1024 || e2ePort > 65535) {
  throw new Error("LABITAT_E2E_PORT must be an integer between 1024 and 65535");
}
if (e2eMode !== "development" && e2eMode !== "production") {
  throw new Error('LABITAT_E2E_MODE must be "development" or "production"');
}

const e2eBaseUrl = `http://127.0.0.1:${e2ePort}`;

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
    baseURL: e2eBaseUrl,
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
      e2eMode === "development"
        ? `node scripts/clean-test-db.mjs && mkdir -p data && pnpm db:push && pnpm db:seed && pnpm exec next dev --turbopack --hostname 127.0.0.1 -p ${e2ePort}`
        : `node scripts/clean-test-db.mjs && mkdir -p data && pnpm db:push && pnpm db:seed && pnpm build && npx next start -p ${e2ePort}`,
    url: e2eBaseUrl,
    reuseExistingServer: false,
    timeout: 300 * 1000,
    env: {
      NODE_ENV: e2eMode === "development" ? "development" : "production",
      DISABLE_STANDALONE: "1",
      PORT: String(e2ePort),
      DATABASE_URL: testDbUrl,
      SECRET_KEY: "test-secret-key-for-e2e-tests-at-least-32-chars!",
      COOKIE_SECURE: "false",
      TEST_SECRET: "e2e-test-reset-token",
    },
  },
});
