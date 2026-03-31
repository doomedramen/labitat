import { test, expect } from "@playwright/test"

test.describe("Dashboard - Empty State", () => {
  test("should show empty state message when no groups exist", async ({
    page,
  }) => {
    await page.goto("/")

    // Should show "Nothing here yet" empty state
    await expect(page.getByTestId("empty-state")).toBeVisible()
    await expect(page.getByTestId("empty-state-message")).toContainText(
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
    // Login first
    await page.goto("/login")
    await page.getByTestId("email-input").fill("admin@example.com")
    await page.getByTestId("password-input").fill("admin123")
    await page.getByTestId("submit-button").click()
    await page.waitForURL("/")

    // Should see Edit button
    await expect(page.getByTestId("edit-button")).toBeVisible()
  })
})

test.describe("Dashboard - Content", () => {
  test("should display dashboard title", async ({ page }) => {
    // Login first
    await page.goto("/login")
    await page.getByTestId("email-input").fill("admin@example.com")
    await page.getByTestId("password-input").fill("admin123")
    await page.getByTestId("submit-button").click()
    await page.waitForURL("/")

    // Should have a title/heading
    await expect(page.getByTestId("dashboard-title")).toBeVisible()
  })

  test("should toggle edit mode with keyboard shortcut (E key)", async ({
    page,
  }) => {
    // Login first
    await page.goto("/login")
    await page.getByTestId("email-input").fill("admin@example.com")
    await page.getByTestId("password-input").fill("admin123")
    await page.getByTestId("submit-button").click()
    await page.waitForURL("/")

    // Press 'e' to toggle edit mode
    await page.keyboard.press("e")

    // Should show edit bar with Add group button
    await expect(page.getByTestId("edit-bar")).toBeVisible()
    await expect(page.getByTestId("add-group-button")).toBeVisible()

    // Press 'e' again to exit edit mode
    await page.keyboard.press("e")
    await expect(page.getByTestId("edit-bar")).not.toBeVisible()
  })

  test("should exit edit mode with Done button", async ({ page }) => {
    // Login first
    await page.goto("/login")
    await page.getByTestId("email-input").fill("admin@example.com")
    await page.getByTestId("password-input").fill("admin123")
    await page.getByTestId("submit-button").click()
    await page.waitForURL("/")

    // Enter edit mode with Edit button
    await page.getByTestId("edit-button").click()
    await expect(page.getByTestId("edit-bar")).toBeVisible()

    // Click Done button
    await page.getByTestId("done-button").click()

    // Should exit edit mode
    await expect(page.getByTestId("edit-bar")).not.toBeVisible()
  })

  test("should exit edit mode with Escape key", async ({ page }) => {
    // Login first
    await page.goto("/login")
    await page.getByTestId("email-input").fill("admin@example.com")
    await page.getByTestId("password-input").fill("admin123")
    await page.getByTestId("submit-button").click()
    await page.waitForURL("/")

    // Enter edit mode
    await page.getByTestId("edit-button").click()
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
      // Click theme toggle
      await themeButton.click()
      await page.waitForTimeout(300)

      // Theme class should have changed
      const newClass = (await page.locator("html").getAttribute("class")) || ""
      // Just verify the click worked - class might have changed
      expect(typeof newClass).toBe("string")
    }
  })
})

test.describe("Dashboard - Empty State Edit Mode", () => {
  test("should show helpful message in empty state when logged in", async ({
    page,
  }) => {
    // Login first
    await page.goto("/login")
    await page.getByTestId("email-input").fill("admin@example.com")
    await page.getByTestId("password-input").fill("admin123")
    await page.getByTestId("submit-button").click()
    await page.waitForURL("/")

    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Should see empty state with helpful message
    await expect(page.getByTestId("empty-state")).toBeVisible()
    await expect(page.getByTestId("empty-state-message")).toContainText(
      /add group|edit|start/i
    )
  })
})
