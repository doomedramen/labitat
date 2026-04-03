import { test as base, expect, type Page } from "@playwright/test"

const TEST_EMAIL = "admin@example.com"
const TEST_PASSWORD = "admin123"

/**
 * Seeds the test user via the setup wizard, then logs in.
 * If setup is already complete (user exists), it goes straight to login.
 */
async function authenticate(page: Page) {
  // Go to setup - if user already exists, it redirects to /login
  await page.goto("/setup")

  // Check if we landed on setup form or got redirected to login
  const url = page.url()
  if (url.includes("/setup")) {
    // Fill setup form
    await page.fill('input[name="email"]', TEST_EMAIL)
    await page.fill('input[name="password"]', TEST_PASSWORD)
    await page.fill('input[name="confirmPassword"]', TEST_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL("/")
    // Now logout so we start fresh for login
    await page.getByTestId("edit-button").click()
    await page.getByTestId("logout-button").click()
    await page.waitForURL("/login")
  }

  // Login through the UI
  await page.goto("/login")
  await page.fill('input[name="email"]', TEST_EMAIL)
  await page.fill('input[name="password"]', TEST_PASSWORD)
  await page.click('button[type="submit"]')
  await page.waitForURL("/")
  await expect(page).toHaveURL("/")
}

/**
 * Test fixture with authentication via REAL UI interactions only.
 * No API calls - everything through clicking, typing, etc.
 */
export const test = base.extend<{
  authenticatedPage: Page
}>({
  authenticatedPage: async ({ page }, use) => {
    await authenticate(page)
    await use(page)
  },
})

export { expect }
