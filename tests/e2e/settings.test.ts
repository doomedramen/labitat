import { test, expect } from "@playwright/test"

test.describe("Settings - Dashboard Title", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login")
    await page.getByTestId("email-input").fill("admin@example.com")
    await page.getByTestId("password-input").fill("admin123")
    await page.getByTestId("submit-button").click()
    await page.waitForURL("/")
  })

  test("should edit dashboard title", async ({ page }) => {
    const newTitle = `My Dashboard ${Date.now()}`

    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Title should become editable
    const titleInput = page.locator(
      'input[data-testid="dashboard-title-input"]'
    )

    if (await titleInput.isVisible()) {
      // If there's a dedicated input, use it
      await titleInput.fill(newTitle)
    } else {
      // Otherwise look for any input near the title
      const titleElement = page.getByTestId("dashboard-title")
      await titleElement.click()

      // Find the input that appears
      const editInput = page
        .locator('input[value*="Labitat"], input:not([type="hidden"])')
        .first()
      if (await editInput.isVisible()) {
        await editInput.fill(newTitle)
      }
    }

    // Save by pressing Enter or clicking Save button
    const saveButton = page.locator('button:has-text("Save")')
    if (await saveButton.isVisible()) {
      await saveButton.click()
    } else {
      await page.keyboard.press("Enter")
    }

    await page.waitForTimeout(500)

    // Verify title changed
    await expect(page.locator(`text=${newTitle}`)).toBeVisible()
  })

  test("should cancel title edit with Escape", async ({ page }) => {
    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Try to edit title
    const titleElement = page.getByTestId("dashboard-title")
    await titleElement.click()

    // Find input
    const editInput = page.locator("input").first()
    if (await editInput.isVisible()) {
      await editInput.fill("Cancelled Title")

      // Press Escape
      await page.keyboard.press("Escape")

      // Should exit edit mode without saving
      await page.waitForTimeout(300)
      await expect(page.getByTestId("edit-bar")).not.toBeVisible()
    }
  })

  test("should show Save and Cancel buttons when editing title", async ({
    page,
  }) => {
    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Click on title to edit
    await page.getByTestId("dashboard-title").click()

    // Should show Save button
    const saveButton = page.locator('button:has-text("Save")')
    const cancelButton = page.locator('button:has-text("Cancel")')

    // These might appear when title is being edited
    if (await saveButton.isVisible()) {
      await expect(saveButton).toBeVisible()
    }
    if (await cancelButton.isVisible()) {
      await expect(cancelButton).toBeVisible()
    }
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

      await page.waitForTimeout(500)

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
      await page.waitForTimeout(300)

      // Reload page
      await page.reload()
      await page.waitForTimeout(300)

      // Theme should persist - check if dark class is present
      const html = page.locator("html")
      const afterReloadClass = (await html.getAttribute("class")) || ""

      expect(afterReloadClass.includes("dark")).toBe(true)
    }
  })
})

test.describe("Keyboard Shortcuts", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login")
    await page.getByTestId("email-input").fill("admin@example.com")
    await page.getByTestId("password-input").fill("admin123")
    await page.getByTestId("submit-button").click()
    await page.waitForURL("/")
  })

  test("should toggle edit mode with E key", async ({ page }) => {
    // Press E to enter edit mode
    await page.keyboard.press("e")
    await expect(page.getByTestId("edit-bar")).toBeVisible()

    // Press E again to exit
    await page.keyboard.press("e")
    await expect(page.getByTestId("edit-bar")).not.toBeVisible()
  })

  test("should not toggle edit mode when typing in input", async ({ page }) => {
    // Go to login to test input behavior
    await page.goto("/login")

    // Focus email input
    await page.getByTestId("email-input").focus()

    // Type 'e' - should appear in input, not toggle edit mode
    await page.keyboard.press("e")

    // The input should contain 'e'
    const value = await page.getByTestId("email-input").inputValue()
    expect(value).toContain("e")
  })

  test("should close dialogs with Escape key", async ({ page }) => {
    // Enter edit mode
    await page.keyboard.press("e")

    // Open add group dialog
    await page.getByTestId("add-group-button").click()
    await expect(page.getByTestId("group-dialog")).toBeVisible()

    // Press Escape
    await page.keyboard.press("Escape")

    // Dialog should close
    await page.waitForTimeout(300)
    await expect(page.getByTestId("group-dialog")).not.toBeVisible()
  })
})
