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
  // The status dot sits in each card's header, beside the name.
  await expect(
    healthy
      .locator("header")
      .getByRole("button", { name: "Status for Healthy: Healthy", exact: true }),
  ).toBeVisible();
  const status = failed.getByRole("button", { name: "Status for Failed: Needs attention" });
  await expect(status).toBeVisible();
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
  expect((await status.boundingBox())!.height).toBeGreaterThanOrEqual(36);
  // A failing service shows its reason in place of the main stat.
  await expect(failed.getByTestId("item-stats")).toContainText(
    /Connection refused|Unable to reach service/,
  );
});

test("cards open their service anywhere except the status dot, which opens details", async ({
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
  // Services with stats are cards; link-only services are compact chips.
  await expect(media).toHaveAttribute("data-layout", "metrics");
  await expect(launcher).toHaveAttribute("data-layout", "launcher");
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    const card = (await media.boundingBox())!;
    const chip = (await launcher.boundingBox())!;
    expect(chip.height).toBeLessThan(card.height / 2);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
  }
  await page
    .context()
    .route("https://media.test/**", (route) => route.fulfill({ body: "App destination" }));
  const popupPromise = page.waitForEvent("popup");
  await media.getByRole("link", { name: /Media/ }).click({ position: { x: 10, y: 10 } });
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://media.test/");
  await popup.close();
  // Clicking the stats opens the service too; only the status dot opens details.
  const statsPopup = page.waitForEvent("popup");
  // The card's link lies over the stats, so the click lands on the link, as a person's would.
  await media.getByTestId("item-stats").click({ force: true });
  await (await statsPopup).close();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await launcher.getByRole("button", { name: /Status for Launcher/ }).click();
  await expect(page.getByRole("dialog", { name: "Launcher" })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await media.getByRole("button", { name: /Status for Media/ }).click();
  await expect(page.getByRole("dialog", { name: "Media" })).toBeVisible();
});
