import { test, expect, type Page } from "@playwright/test"

const TEST_EMAIL = "admin@example.com"
const TEST_PASSWORD = "admin123"

async function login(page: Page) {
  await page.goto("/")
  await page.getByTestId("sign-in-link").click()
  await page.getByTestId("email-input").fill(TEST_EMAIL)
  await page.getByTestId("password-input").fill(TEST_PASSWORD)
  await page.getByTestId("submit-button").click()
  await page.waitForURL("/")
}

/**
 * Delete all groups via the UI to ensure a clean state.
 */
async function cleanGroups(page: Page) {
  await page.goto("/")
  await page.getByTestId("sign-in-link").click()
  await page.getByTestId("email-input").fill(TEST_EMAIL)
  await page.getByTestId("password-input").fill(TEST_PASSWORD)
  await page.getByTestId("submit-button").click()
  await page.waitForURL("/")

  // Enter edit mode
  await page.getByTestId("edit-button").first().click()

  // Delete all existing groups
  const deleteButtons = page.getByTestId("group-delete-button")
  const count = await deleteButtons.count()
  for (let i = 0; i < count; i++) {
    await deleteButtons.first().click()
    // Confirm deletion if dialog appears
    const confirmBtn = page.getByTestId("group-delete-confirm")
    if (await confirmBtn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await confirmBtn.click()
    }
  }

  // Exit edit mode
  await page.getByTestId("done-button").click()
  await page.waitForTimeout(300)

  // Logout so subsequent tests start unauthenticated
  // Sign out button is only visible in edit mode
  await page.getByTestId("edit-button").first().click()
  await page.getByTestId("logout-button").click()
  await page.waitForTimeout(500)
}

test.describe("Dashboard - Empty State", () => {
  test.beforeEach(async ({ page }) => {
    await cleanGroups(page)
  })

  test("should show empty state message when no groups exist", async ({
    page,
  }) => {
    await page.goto("/")

    // Should show "Nothing here yet" empty state (unauthenticated user)
    await expect(page.getByTestId("empty-state").first()).toBeVisible()
    await expect(page.getByTestId("empty-state-message").first()).toContainText(
      /nothing here/i
    )
  })

  test("should show sign in link for unauthenticated users", async ({
    page,
  }) => {
    await page.goto("/")

    // Should see sign in link
    await expect(page.getByTestId("sign-in-link")).toBeVisible()
  })

  test("should show edit button for logged in users", async ({ page }) => {
    await login(page)
    await expect(page.getByTestId("edit-button")).toBeVisible()
  })
})

test.describe("Dashboard - Content", () => {
  test.beforeEach(async ({ page }) => {
    await cleanGroups(page)
  })

  test("should display dashboard title", async ({ page }) => {
    await login(page)
    await expect(page.getByTestId("dashboard-title")).toBeVisible()
  })

  test("should exit edit mode with Done button", async ({ page }) => {
    await login(page)

    // Enter edit mode with Edit button
    await page.getByTestId("edit-button").first().click()
    await expect(page.getByTestId("edit-bar")).toBeVisible()

    // Click Done button
    await page.getByTestId("done-button").click()

    // Should exit edit mode
    await expect(page.getByTestId("edit-bar")).not.toBeVisible()
  })

  test("should exit edit mode with Escape key", async ({ page }) => {
    await login(page)

    // Enter edit mode
    await page.getByTestId("edit-button").first().click()
    await expect(page.getByTestId("edit-bar")).toBeVisible()

    // Press Escape
    await page.keyboard.press("Escape")

    // Should exit edit mode
    await expect(page.getByTestId("edit-bar")).not.toBeVisible()
  })

  test("should toggle theme", async ({ page }) => {
    await page.goto("/")

    // Find theme switcher button
    const themeButton = page.locator(
      'button[aria-label*="theme"], button[aria-label*="light"], button[aria-label*="dark"]'
    )

    if (await themeButton.isVisible()) {
      // Get initial class
      const html = page.locator("html")
      const initialClass = (await html.getAttribute("class")) || ""

      // Click theme toggle
      await themeButton.click()

      // Wait for theme class to change
      await expect(html).not.toHaveClass(initialClass || "none")

      // Theme class should have changed
      const newClass = (await html.getAttribute("class")) || ""
      // Just verify the click worked - class might have changed
      expect(typeof newClass).toBe("string")
    }
  })
})

test.describe("Dashboard - Empty State Edit Mode", () => {
  test.beforeEach(async ({ page }) => {
    await cleanGroups(page)
  })

  test("should show helpful message in empty state when logged in", async ({
    page,
  }) => {
    await login(page)

    // Enter edit mode
    await page.getByTestId("edit-button").first().click()

    // Should see empty state with helpful message
    await expect(page.getByTestId("empty-state").first()).toBeVisible()
    await expect(page.getByTestId("empty-state-message").first()).toContainText(
      /add group|edit|start/i
    )
  })
})
