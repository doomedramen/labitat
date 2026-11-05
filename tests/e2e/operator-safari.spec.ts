import { test, expect, seedAndAuth } from "../fixtures";
import { operatorDesignGroups } from "../helpers/operator-design-fixture";
test.describe("Touch-first Safari", () => {
  test.use({
    isMobile: true,
    hasTouch: true,
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
  });
  test("phone rows, keyboard-sized inputs, details, and arrangement controls", async ({ page }) => {
    await seedAndAuth(page, {
      settings: { dashboardTitle: "Page Family Homelab" },
      groups: operatorDesignGroups,
    });
    await page.goto("/");
    const search = page.getByRole("searchbox", { name: "Find a service" });
    await expect(search).toHaveCSS("font-size", "16px");
    await search.tap();
    await search.fill("Media");
    await expect(page.getByTestId("item-card")).toHaveCount(6);
    await search.fill("");
    await search.blur();
    expect(
      (await page.getByTestId("item-card").first().boundingBox())!.height,
    ).toBeGreaterThanOrEqual(150);
    expect(
      (await page.getByRole("button", { name: /Status for Tautulli/ }).boundingBox())!.height,
    ).toBe(34);
    expect(
      await page
        .getByRole("button", { name: /Status for Tautulli/ })
        .evaluate((el) => getComputedStyle(el, "::before").inset),
    ).toBe("-5px");
    await page.getByRole("button", { name: "Inspect Seerr", exact: true }).tap();
    const panel = page.getByRole("dialog", { name: "Seerr", exact: true });
    await expect(panel).toBeVisible();
    const bounds = (await panel.boundingBox())!;
    expect(bounds.x).toBe(0);
    expect(bounds.width).toBe(390);
    expect(bounds.height).toBeCloseTo(844, 0);
    await page.getByRole("button", { name: "Close", exact: true }).tap();
    await expect(panel).toHaveCount(0);
    await page.getByRole("button", { name: "Manage dashboard" }).tap();
    await page.getByRole("menuitem", { name: "Arrange dashboard" }).tap();
    await page.getByRole("button", { name: "Arrange Plex", exact: true }).tap();
    const selector = page.getByRole("combobox", { name: "Move Plex to group" });
    await expect(selector).toHaveCSS("font-size", "16px");
    await selector.selectOption({ label: "Downloads" });
    await page.getByRole("button", { name: "Cancel", exact: true }).tap();
    await expect(
      page.locator("section[data-group-id]").first().getByRole("link", { name: /Plex/ }),
    ).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: "test-results/operator-design-safari.png", fullPage: false });
  });
});

test("landscape touch board preserves geometry and full tap targets", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await seedAndAuth(page, { groups: operatorDesignGroups });
  await page.goto("/");
  const groups = await page
    .locator("section[data-group-id]")
    .evaluateAll((elements) => elements.map((element) => element.getBoundingClientRect().toJSON()));
  for (let a = 0; a < groups.length; a++)
    for (let b = a + 1; b < groups.length; b++) {
      const x =
        Math.min(groups[a].right, groups[b].right) - Math.max(groups[a].left, groups[b].left);
      const y =
        Math.min(groups[a].bottom, groups[b].bottom) - Math.max(groups[a].top, groups[b].top);
      expect(x > 1 && y > 1).toBe(false);
    }
  const row = page.getByTestId("item-card").first();
  expect((await row.getByRole("link").boundingBox())!.height).toBeGreaterThanOrEqual(44);
  expect(
    (await row.getByRole("button", { name: /Inspect/ }).boundingBox())!.height,
  ).toBeGreaterThanOrEqual(44);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("touch menus survive native trigger focus and retain normal dismissal", async ({ page }) => {
  await seedAndAuth(page, {
    groups: [{ name: "Apps", items: [{ label: "One", href: "https://one.test" }] }],
  });
  await page.goto("/");
  const trigger = page.getByRole("button", { name: "Manage dashboard" });
  await trigger.tap();
  await expect(trigger).toHaveAttribute("aria-expanded", "true");
  const arrange = page.getByRole("menuitem", { name: "Arrange dashboard" });
  expect(
    await arrange.evaluate((element) => {
      const range = document.createRange();
      range.selectNodeContents(element);
      return range.getClientRects().length;
    }),
  ).toBe(1);
  await arrange.tap();
  await expect(page.getByRole("button", { name: "Save arrangement" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).tap();
  await trigger.tap();
  await page.getByRole("heading", { level: 1 }).tap();
  await expect(page.getByRole("menu")).toHaveCount(0);
  await trigger.tap();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(trigger).toBeFocused();
});

test("status reasons open on tap and dismiss without opening service details", async ({ page }) => {
  await seedAndAuth(page, {
    groups: [
      {
        name: "Media",
        items: [
          {
            label: "Failed",
            serviceType: "radarr",
            cachedWidgetData: { _status: "error", _statusText: "Connection refused" },
          },
        ],
      },
    ],
  });
  await page.goto("/");
  const card = page.getByTestId("item-card");
  const status = card.getByRole("button", { name: /Status for Failed/ });
  await status.tap();
  await expect(card.getByRole("tooltip")).toContainText(
    /Connection refused|Unable to reach service/,
  );
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("heading", { level: 1 }).tap();
  await expect(card.getByRole("tooltip")).toHaveCount(0);
});
