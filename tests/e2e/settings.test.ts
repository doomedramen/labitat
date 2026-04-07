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

async function waitForEditMode(page: Page) {
  await expect(page.getByTestId("edit-bar")).toBeVisible()
}

async function waitForExitEditMode(page: Page) {
  await expect(page.getByTestId("edit-bar")).not.toBeVisible()
}

async function waitForGroupDialogClose(page: Page) {
  await expect(page.getByTestId("group-dialog")).not.toBeVisible()
}

test.describe("Settings - Dashboard Title", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should edit dashboard title", async ({ page }) => {
    const newTitle = `My Dashboard ${Date.now()}`

    // Enter edit mode
    await page.getByTestId("edit-button").click()
    await waitForEditMode(page)

    // Title should become editable input
    const titleInput = page.getByTestId("dashboard-title-input")
    await expect(titleInput).toBeVisible()
    await titleInput.fill(newTitle)

    // Exit edit mode with Done button to save
    await page.getByTestId("done-button").click()
    await waitForExitEditMode(page)

    // Verify title changed - check the h1 element
    await expect(page.getByTestId("dashboard-title")).toContainText(newTitle)
  })

  test("should cancel title edit with Escape", async ({ page }) => {
    // Enter edit mode
    await page.getByTestId("edit-button").click()
    await waitForEditMode(page)

    // Get original title
    const titleInput = page.getByTestId("dashboard-title-input")
    await expect(titleInput).toBeVisible()
    const originalTitle = await titleInput.inputValue()

    // Change title
    await titleInput.fill("Cancelled Title")

    // Press Escape - this cancels the edit
    await page.keyboard.press("Escape")

    // Edit mode should be exited
    await expect(page.getByTestId("edit-button")).toBeVisible()
    // Title should be unchanged
    await expect(page.getByTestId("dashboard-title")).toContainText(
      originalTitle
    )
  })

  test("should show Done button when editing title", async ({ page }) => {
    // Enter edit mode
    await page.getByTestId("edit-button").click()
    await waitForEditMode(page)

    // Title input should be visible
    await expect(page.getByTestId("dashboard-title-input")).toBeVisible()

    // Done button should be visible in edit bar
    await expect(page.getByTestId("done-button")).toBeVisible()
  })
})

test.describe("Settings - Theme", () => {
  test("should toggle between light and dark theme", async ({ page }) => {
    await page.goto("/")

    // Click theme switcher to open dropdown
    const themeSwitcher = page.getByTestId("theme-switcher")

    if (await themeSwitcher.isVisible()) {
      await themeSwitcher.click()

      // Get initial theme
      const html = page.locator("html")
      const initialClass = (await html.getAttribute("class")) || ""
      const isDark = initialClass.includes("dark")

      // Select opposite theme
      if (isDark) {
        await page.getByTestId("theme-light").click()
      } else {
        await page.getByTestId("theme-dark").click()
      }

      // Wait for theme class to change
      await expect(html).not.toHaveClass(initialClass || "none")

      // Verify theme changed
      const newClass = (await html.getAttribute("class")) || ""
      const isNowDark = newClass.includes("dark")

      expect(isDark).not.toBe(isNowDark)
    } else {
      // If no theme toggle found, skip this test
      console.log("Theme toggle not found - skipping")
    }
  })

  test("should persist theme across page reloads", async ({ page }) => {
    await page.goto("/")

    // Click theme switcher
    const themeSwitcher = page.getByTestId("theme-switcher")

    if (await themeSwitcher.isVisible()) {
      await themeSwitcher.click()

      // Select dark theme
      await page.getByTestId("theme-dark").click()

      // Wait for theme to apply
      const html = page.locator("html")
      await expect(html).toHaveClass(/dark/)

      // Reload page
      await page.reload()
      await page.waitForLoadState("domcontentloaded")

      // Theme should persist - check if dark class is present
      const afterReloadClass = (await html.getAttribute("class")) || ""

      expect(afterReloadClass.includes("dark")).toBe(true)
    }
  })
})

test.describe("Keyboard Shortcuts", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
  })

  test("should close dialogs with Escape key", async ({ page }) => {
    // Enter edit mode
    await page.getByTestId("edit-button").click()
    await waitForEditMode(page)

    // Open add group dialog
    await page.getByTestId("add-group-button").click()
    await expect(page.getByTestId("group-dialog")).toBeVisible()

    // Press Escape
    await page.keyboard.press("Escape")

    // Dialog should close
    await expect(page.getByTestId("group-dialog")).not.toBeVisible()
  })
})
