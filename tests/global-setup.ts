import { chromium, type FullConfig } from "@playwright/test"

const TEST_EMAIL = "admin@example.com"
const TEST_PASSWORD = "admin123"

async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch()
  const page = await browser.newPage()

  // Go to the app
  const baseURL = config.webServer?.url ?? "http://localhost:3000"
  await page.goto(baseURL + "/setup")

  // If setup page is available (no admin exists), create the test user
  const url = page.url()
  if (url.includes("/setup")) {
    await page.fill('input[name="email"]', TEST_EMAIL)
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL("/")
  }

  await browser.close()
}

export default globalSetup
