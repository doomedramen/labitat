import { test, expect, seedAndAuth } from "../fixtures";
test("status reasons appear immediately on hover, focus and tap", async ({ page }) => {
  await seedAndAuth(page, {
    groups: [
      {
        name: "Services",
        items: [
          {
            label: "Healthy",
            serviceType: "radarr",
            cachedWidgetData: { _status: "ok", movies: 42 },
          },
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
  const healthy = page.getByTestId("item-card").first();
  const failed = page.getByTestId("item-card").last();
  await expect(
    healthy
      .locator("footer")
      .getByRole("button", { name: "Status for Healthy: Healthy", exact: true }),
  ).toBeVisible();
  await expect(
    failed.getByRole("button", { name: "Status for Failed: Needs attention", exact: true }),
  ).toBeVisible();
  const status = failed.getByRole("button", { name: "Status for Failed: Needs attention" });
  await expect(failed.getByRole("tooltip")).toBeHidden();
  await status.hover();
  await expect(failed.getByRole("tooltip")).toContainText(
    /Connection refused|Unable to reach service/,
  );
  const popup = (await failed.getByRole("tooltip").boundingBox())!;
  const indicator = (await status.boundingBox())!;
  expect(popup.y + popup.height).toBeLessThanOrEqual(indicator.y);
  await page.mouse.move(0, 0);
  await status.focus();
  await expect(failed.getByRole("tooltip")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(failed.getByRole("tooltip")).toBeHidden();
  expect((await status.boundingBox())!.height).toBe(34);
  expect(await status.evaluate((el) => getComputedStyle(el, "::before").inset)).toBe("-5px");
  expect(await healthy.locator("svg path[stroke-dashoffset]").count()).toBe(0);
});

test("card background launches, metrics inspect, and status stays in the footer", async ({
  page,
}) => {
  await seedAndAuth(page, {
    groups: [
      {
        name: "Apps",
        items: [
          {
            label: "Media",
            href: "https://media.test",
            serviceType: "radarr",
            cachedWidgetData: { _status: "ok", queued: 1, missing: 2, wanted: 3, movies: 4 },
          },
          { label: "Launcher", href: "https://launcher.test" },
        ],
      },
    ],
  });
  await page.goto("/");
  const media = page.getByTestId("item-card").first();
  const launcher = page.getByTestId("item-card").last();
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const card of [media, launcher]) {
      const bounds = (await card.boundingBox())!;
      const status = (await card
        .locator("footer")
        .getByRole("button", { name: /Status for/ })
        .boundingBox())!;
      expect(status.width).toBeGreaterThanOrEqual(bounds.width - 2);
      expect(status.y + status.height).toBeGreaterThanOrEqual(bounds.y + bounds.height - 2);
    }
  }
  await page
    .context()
    .route("https://media.test/**", (route) => route.fulfill({ body: "App destination" }));
  const popupPromise = page.waitForEvent("popup");
  await media.getByRole("link", { name: /Media/ }).click({ position: { x: 10, y: 10 } });
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://media.test/");
  await popup.close();
  await media.getByRole("button", { name: "Inspect Media" }).click();
  await expect(page.getByRole("dialog", { name: "Media" })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await launcher.getByRole("button", { name: /Status for Launcher/ }).click();
  await launcher.getByRole("button", { name: "Service details" }).click();
  await expect(page.getByRole("dialog", { name: "Launcher" })).toBeVisible();
});
