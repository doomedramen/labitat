import { test, expect, seedAndAuth } from "../fixtures"

test.describe("Theme Switching", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndAuth(page)
    await page.goto("/")
  })

  test("opens theme/palette dropdown", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click()
    await expect(page.getByText("Theme", { exact: true }).first()).toBeVisible()
    await expect(
      page.getByText("Palette", { exact: true }).first()
    ).toBeVisible()
  })

  test("switches to dark theme", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click()
    // Use exact match to avoid "One Dark" matching
    await page.getByRole("menuitemradio", { name: "Dark", exact: true }).click()

    const html = page.locator("html")
    await expect(html).toHaveClass(/dark/)
  })

  test("switches to light theme", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click()
    await page.getByRole("menuitemradio", { name: "Dark", exact: true }).click()
    await expect(page.locator("html")).toHaveClass(/dark/)

    // Close the dropdown (it no longer auto-closes on selection)
    await page.keyboard.press("Escape")

    await page.getByRole("button", { name: "Theme settings" }).click()
    await page
      .getByRole("menuitemradio", { name: "Light", exact: true })
      .click()

    await expect(page.locator("html")).not.toHaveClass(/dark/)
  })

  test("theme persists on page reload", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click()
    await page.getByRole("menuitemradio", { name: "Dark", exact: true }).click()

    await page.reload()
    await expect(page.locator("html")).toHaveClass(/dark/)
  })
})
