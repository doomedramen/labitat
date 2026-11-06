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
    await expect(page.getByText("34 services", { exact: true })).toHaveCount(0);
    const filter = page.getByRole("button", { name: "All 34", exact: true });
    await expect(filter).toBeVisible();
    const titleBounds = (await page.getByRole("heading", { level: 1 }).boundingBox())!;
    const filterBounds = (await filter.boundingBox())!;
    expect(filterBounds.y).toBeGreaterThanOrEqual(titleBounds.y + titleBounds.height);
    if (width >= 1200) {
      const toolbar = (await page.locator('[aria-label="Service filters"]').boundingBox())!;
      const picker = (await page.getByRole("combobox", { name: "Filter by group" }).boundingBox())!;
      expect(Math.abs(toolbar.height - picker.height)).toBeLessThanOrEqual(1);
      expect(Math.abs(toolbar.y - picker.y)).toBeLessThanOrEqual(1);
    }

    await expect(
      page.locator("section[data-group-id]").first().getByText("06", { exact: true }),
    ).toHaveCount(0);
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
    if (width === 390 || width === 320) {
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

test("three-digit health filters fit a 320px screen", async ({ page }) => {
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));
  await page.setViewportSize({ width: 320, height: 740 });
  await seedAndAuth(page, {
    groups: [
      {
        name: "Infrastructure",
        items: Array.from({ length: 100 }, (_, i) => ({
          label: `Host ${i + 1}`,
          serviceType: "glances",
          cachedWidgetData: { cpuPercent: 0, memPercent: 50, swapPercent: 0, load1: 1 },
        })),
      },
    ],
  });
  await page.goto("/");
  const ids = await page
    .getByTestId("item-card")
    .evaluateAll((items) => items.map((item) => item.getAttribute("data-item-id")));
  const observedAt = Date.now() + 1000;
  await page.route("**/api/events", (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      body: ids
        .map(
          (itemId) =>
            `data: ${JSON.stringify({
              type: "update",
              itemId,
              widgetData: {
                _status: "warn",
                _statusText: "Awaiting upstream",
                cpuPercent: 0,
                memPercent: 50,
                swapPercent: 0,
                load1: 1,
              },
              pingStatus: null,
              fetchedAt: observedAt,
              observationUpdatedAt: observedAt,
              lastSuccessAt: observedAt - 3600000,
              lastAttemptAt: observedAt,
              freshness: "stale",
              configurationRevision: 0,
            })}\n\n`,
        )
        .join(""),
    }),
  );
  await page.reload();
  for (const name of ["All 100", "Needs attention 100", "Stale 100"]) {
    const filter = page.getByRole("button", { name, exact: true });
    await expect(filter).toBeVisible();
    const bounds = (await filter.boundingBox())!;
    expect(bounds.x).toBeGreaterThanOrEqual(0);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(320);
    expect(await filter.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  }
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  for (const width of [320, 375, 390, 430]) {
    await page.setViewportSize({ width, height: 844 });
    const picker = (await page.getByRole("combobox", { name: "Filter by group" }).boundingBox())!;
    for (const name of ["All 100", "Needs attention 100", "Stale 100"]) {
      const filter = page.getByRole("button", { name, exact: true });
      const box = (await filter.boundingBox())!;
      expect(await filter.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
      expect(box.x + box.width <= picker.x || box.y + box.height <= picker.y).toBe(true);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  expect(pageErrors).not.toContainEqual(expect.stringContaining("Maximum update depth"));
});
