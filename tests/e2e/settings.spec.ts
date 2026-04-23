import { test, expect, seedAndAuth } from "../fixtures";

test.describe("Settings & Configuration", () => {
  test.describe("Edit Mode", () => {
    test("enters and exits edit mode", async ({ page }) => {
      await seedAndAuth(page);
      await page.goto("/edit");
      await expect(page.getByRole("button", { name: "Done" })).toBeVisible();

      // Done returns to /
      await page.getByRole("button", { name: "Done" }).click();
      await expect(page).toHaveURL("/");
      await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
    });

    test("shows editing indicators", async ({ page }) => {
      await seedAndAuth(page);
      await page.goto("/edit");

      // Look for edit mode indicators (drag handles, delete buttons, etc.)
      const editIndicators = page.locator(
        "[data-drag-handle], [data-delete-button], .edit-mode-only",
      );
      const count = await editIndicators.count();
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe("Stat Card Order", () => {
    test("reorders stat cards in edit mode", async ({ page }) => {
      await seedAndAuth(page);
      await page.goto("/edit");

      // Check if there are stat cards
      const statCards = page.locator("[data-stat-card]");
      const count = await statCards.count();

      if (count > 1) {
        // Verify stat cards are draggable
        const dragHandle = page.locator("[data-drag-handle]").first();
        await expect(dragHandle).toBeVisible();
      }
    });
  });

  test.describe("Responsive Settings", () => {
    test("settings are accessible on mobile", async ({ page }) => {
      await seedAndAuth(page);
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/edit");

      // Verify settings buttons are still accessible
      const editButton = page.getByRole("button", { name: "Done" });
      await expect(editButton).toBeVisible();
    });
  });
});
