import { test as base, expect, type Page } from "@playwright/test"

/**
 * Test fixture with authentication via REAL UI interactions only.
 * No API calls - everything through clicking, typing, etc.
 */
export const test = base.extend<{
  authenticatedPage: Page
}>({
  authenticatedPage: async ({ page }, use) => {
    // Login through the UI with real interactions
    await page.goto("/login")
    await page.fill('input[name="email"]', "admin@example.com")
    await page.fill('input[name="password"]', "admin123")
    await page.click('button[type="submit"]')
    await page.waitForURL("/")
    await expect(page).toHaveURL("/")

    await use(page)

    // No cleanup via API - let tests handle their own cleanup through UI
  },
})

export { expect }
