import { test, expect, seedAndAuth } from "../fixtures";
import { PALETTES } from "@/lib/palettes";

test.describe("Palette Switching", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndAuth(page);
    await page.goto("/");
  });

  test("shows all palette options", async ({ page }) => {
    await page.getByRole("button", { name: "Theme settings" }).click();
    for (const palette of PALETTES) {
      await expect(
        page.getByRole("menuitemradio", { name: palette.label, exact: true }),
      ).toBeVisible();
    }
  });

  test("switches palette and applies data-palette attribute", async ({ page }) => {
    const nord = PALETTES.find((p) => p.id === "nord")!;
    await page.getByRole("button", { name: "Theme settings" }).click();
    await page.getByRole("menuitemradio", { name: nord.label, exact: true }).click();

    await expect(page.locator("html")).toHaveAttribute("data-palette", "nord");
  });

  test("palette persists on page reload", async ({ page }) => {
    const dracula = PALETTES.find((p) => p.id === "dracula")!;
    await page.getByRole("button", { name: "Theme settings" }).click();
    await page.getByRole("menuitemradio", { name: dracula.label, exact: true }).click();

    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-palette", "dracula");
  });

  test("can switch between multiple palettes", async ({ page }) => {
    const html = page.locator("html");
    const gruvbox = PALETTES.find((p) => p.id === "gruvbox")!;
    const catppuccin = PALETTES.find((p) => p.id === "catppuccin_frappe")!;

    await page.getByRole("button", { name: "Theme settings" }).click();
    await page.getByRole("menuitemradio", { name: gruvbox.label, exact: true }).click();
    await expect(html).toHaveAttribute("data-palette", "gruvbox");

    await page.keyboard.press("Escape");
    await page.getByRole("button", { name: "Theme settings" }).click();
    await page.getByRole("menuitemradio", { name: catppuccin.label, exact: true }).click();
    await expect(html).toHaveAttribute("data-palette", "catppuccin_frappe");
  });
});
