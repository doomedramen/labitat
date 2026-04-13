import { test, expect, seedAndAuth } from "../fixtures";

const PALETTES = [
  "Default",
  "Catppuccin",
  "Dawn",
  "Dracula",
  "Gruvbox",
  "Mist Green",
  "Monokai",
  "Nord",
  "One Dark",
  "Sakura Blossom Neon",
  "Solarized",
  "Tokyo Night",
  "Vintage Paper",
];

test.describe("Palette Switching", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndAuth(page);
    await page.goto("/");
  });

  test("shows all palette options", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click();
    for (const palette of PALETTES) {
      await expect(page.getByRole("menuitemradio", { name: palette, exact: true })).toBeVisible();
    }
  });

  test("switches palette and applies data-palette attribute", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click();
    await page.getByRole("menuitemradio", { name: "Nord", exact: true }).click();

    await expect(page.locator("html")).toHaveAttribute("data-palette", "nord");
  });

  test("palette persists on page reload", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click();
    await page.getByRole("menuitemradio", { name: "Dracula", exact: true }).click();

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-palette", "dracula");
  });

  test("can switch between multiple palettes", async ({ page }) => {
    const html = page.locator("html");

    await page.getByRole("button", { name: "Theme settings" }).click();
    await page.getByRole("menuitemradio", { name: "Gruvbox", exact: true }).click();
    await expect(html).toHaveAttribute("data-palette", "gruvbox");

    // Close the dropdown with Escape, then reopen
    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Theme settings" }).click();
    await page.getByRole("menuitemradio", { name: "Catppuccin", exact: true }).click();
    await expect(html).toHaveAttribute("data-palette", "catppuccin");
  });
});
