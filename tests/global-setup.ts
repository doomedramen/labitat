import { chromium, type FullConfig } from "@playwright/test"
import { cleanTestDb } from "../scripts/clean-test-db.mjs"

const TEST_EMAIL = "admin@example.com"
const TEST_PASSWORD = "admin123"

async function globalSetup(config: FullConfig) {
  // Seed the admin user via the setup wizard
  const browser = await chromium.launch()
  const page = await browser.newPage()

  const baseURL = config.webServer?.url ?? "http://localhost:3000"
  await page.goto(baseURL + "/setup")

  await page.fill('input[name="email"]', TEST_EMAIL)
  await page.fill('input[name="password"]', TEST_PASSWORD)
  await page.fill('input[name="confirmPassword"]', TEST_PASSWORD)

  // Wait for navigation to start, then wait for the URL to be "/"
  const navigationPromise = page.waitForURL("**/", { timeout: 30000 })
  await page.click('button[type="submit"]')
  await navigationPromise

  await browser.close()
}

async function globalTeardown() {
  cleanTestDb()
}

export { globalSetup as default, globalTeardown }
