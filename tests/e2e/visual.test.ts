import { test, expect } from "@playwright/test";

test.describe("Visual Regression", () => {
  test("Dashboard snapshot", async ({ page }) => {
    // Go to the dashboard
    await page.goto("/");

    // Wait for the dashboard title to be visible (indicates page load)
    await expect(page.locator("h1")).toBeVisible();

    // Wait for widgets to potentially load (some might be skeleton/loading)
    await page.waitForTimeout(2000);

    // Take a screenshot of the full page
    await expect(page).toHaveScreenshot("dashboard-home.png", {
      fullPage: true,
      maxDiffPixelRatio: 0.05, // Allow for minor differences in rendering/fonts
    });
  });

  test("Edit mode snapshot", async ({ page }) => {
    // We assume the user is logged in or the test environment has a mock session
    // For now, let's just try to enter edit mode if the button exists
    await page.goto("/");

    const editButton = page.getByRole("button", { name: /edit/i });
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot("dashboard-edit-mode.png", {
        fullPage: true,
        maxDiffPixelRatio: 0.05,
      });
    }
  });
});
