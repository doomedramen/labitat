import { test, expect, seedAndAuth } from "../fixtures";

test.describe("Theme Switching", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndAuth(page);
    await page.goto("/");
  });

  test("opens theme/palette dropdown", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click();
    await expect(page.getByRole("menuitemradio", { name: "Dark", exact: true })).toBeVisible();
  });

  test("switches to light", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click();
    await page.getByRole("menuitemradio", { name: "Light", exact: true }).click();

    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-palette", "light");
  });

  test("switches to dark", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click();
    await page.getByRole("menuitemradio", { name: "Dark", exact: true }).click();

    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-palette", "dark");
  });

  test("palette persists on page reload", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click();
    await page.getByRole("menuitemradio", { name: "Light", exact: true }).click();

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-palette", "light");
  });
});
