import { test, expect, seedAndAuth, SEED_GROUPS } from "../fixtures";

// These tests validate mobile-specific layout behavior.
// They run on all projects but are most meaningful on mobile viewports.
test.describe("Mobile Layout", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");
  });

  test("link-only services are compact, touchable chips on a small viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });

    const cards = page.getByTestId("item-card");
    await expect(cards).toHaveCount(3);
    await expect(cards.and(page.locator('[data-layout="launcher"]'))).toHaveCount(3);
    const boxes = await cards.evaluateAll((elements) =>
      elements.map((element) => element.getBoundingClientRect().toJSON()),
    );
    expect(boxes.every((box) => box.height >= 44 && box.height < 60)).toBe(true);
    expect(boxes.every((box) => box.left >= 0 && box.right <= 375)).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
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
