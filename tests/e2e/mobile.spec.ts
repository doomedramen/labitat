import { test, expect, seedAndAuth, SEED_GROUPS } from "../fixtures";

// These tests validate mobile-specific layout behavior.
// They run on all projects but are most meaningful on mobile viewports.
test.describe("Mobile Layout", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");
  });

  test("dashboard renders in single column on small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    // Items grid should collapse to single column
    const grid = page.locator(".grid").first();
    const classes = await grid.getAttribute("class");
    // The grid uses responsive classes: grid-cols-1 sm:grid-cols-2 ...
    expect(classes).toContain("grid-cols-1");
  });

  test("header is responsive on small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    // Title and buttons should still be visible
    await expect(page.getByText("Labitat")).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
  });

  test("edit mode works on small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page.getByRole("button", { name: "Done" })).toBeVisible();
  });
});
