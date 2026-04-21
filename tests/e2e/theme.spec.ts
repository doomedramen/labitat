import { test, expect, seedAndAuth } from "../fixtures";

test.describe("Theme Switching", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndAuth(page);
    await page.goto("/");
  });

  test("opens theme/palette dropdown", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click();
    await expect(page.getByText("Theme", { exact: true }).first()).toBeVisible();
    await expect(page.getByRole("menuitemradio", { name: "Nord", exact: true })).toBeVisible();
  });

  test("switches palette to dracula", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click();
    await page.getByRole("menuitemradio", { name: "Dracula", exact: true }).click();

    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-palette", "dracula");
  });

  test("switches palette to tokyo night", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click();
    await page.getByRole("menuitemradio", { name: "Tokyo Night", exact: true }).click();

    const html = page.locator("html");
    await expect(html).toHaveAttribute("data-palette", "tokyo_night");
  });

  test("palette persists on page reload", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click();
    await page.getByRole("menuitemradio", { name: "Dracula", exact: true }).click();

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-palette", "dracula");
  });
});
