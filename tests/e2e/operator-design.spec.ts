import { test, expect, seedAndAuth } from "../fixtures";
import { operatorDesignGroups } from "../helpers/operator-design-fixture";

test("mobile-first mixed service board", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await seedAndAuth(page, {
    settings: { dashboardTitle: "Page Family Homelab" },
    groups: operatorDesignGroups,
  });
  for (const [width, height, name] of [
    [320, 740, "small-phone"],
    [390, 844, "phone"],
    [600, 1000, "narrow"],
    [1440, 1000, "desktop"],
    [1800, 1000, "wide"],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.goto("/");
    await expect(page.getByTestId("item-card")).toHaveCount(34);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    // Decode icons throughout the page before taking a full-page reference.
    await page.evaluate(async () => {
      await Promise.allSettled(
        Array.from(document.images, async (image) => {
          image.loading = "eager";
          await image.decode();
        }),
      );
    });
    await expect
      .poll(() =>
        page
          .locator('[data-testid="item-card"] img')
          .evaluateAll((images) =>
            images.every(
              (image) =>
                !(image instanceof HTMLImageElement) ||
                !image.naturalWidth ||
                getComputedStyle(image).opacity === "1",
            ),
          ),
      )
      .toBe(true);
    if (width === 390) {
      const rates = page.getByTestId("item-card").filter({ hasText: "qBittorrent" });
      for (const value of ["13MB/s", "840KB/s"]) {
        const text = rates.getByText(value, { exact: true });
        expect(await text.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      }
    }
    await page.screenshot({ path: `test-results/operator-design-${name}.png`, fullPage: true });
  }
  await page.getByRole("button", { name: "Theme settings" }).click();
  await page.getByRole("menuitemradio", { name: "Light", exact: true }).click();
  await page.screenshot({ path: "test-results/operator-design-light.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "test-results/operator-design-phone-light.png", fullPage: true });
  await page.screenshot({ path: "test-results/operator-design-phone-viewport.png" });
});
