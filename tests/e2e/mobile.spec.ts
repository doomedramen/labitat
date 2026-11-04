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
    const cards = page.getByTestId("item-card");
    const boxes = await cards.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().toJSON()),
    );
    expect(new Set(boxes.map((box) => box.x)).size).toBe(1);
    expect(boxes.every((box) => box.height === 96)).toBe(true);
  });

  test("header is responsive on small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    // Title and buttons should still be visible
    await expect(
      page.getByRole("heading", { level: 1, name: "Labitat", exact: true }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Manage dashboard" })).toBeVisible();
  });

  test("edit mode works on small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.getByRole("button", { name: "Manage dashboard" }).click();
    await page.getByRole("menuitem", { name: "Arrange dashboard" }).click();
    await expect(page.getByRole("button", { name: "Save arrangement" })).toBeVisible();
  });
});
