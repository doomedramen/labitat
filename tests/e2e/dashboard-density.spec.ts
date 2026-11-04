import { test, expect, seedAndAuth } from "../fixtures";

const groups = [
  {
    name: "Media",
    items: [
      {
        label: "Radarr",
        href: "https://radarr.test",
        serviceType: "radarr",
        cachedWidgetData: { queued: 0, missing: 31, wanted: 107, movies: 629 },
      },
      { label: "Links", href: "https://example.test" },
      {
        label: "Glances",
        serviceType: "glances",
        cachedWidgetData: {
          cpuPercent: 31,
          memPercent: 52,
          memUsed: "4 GB",
          swapPercent: 0,
          load1: 1.2,
          uptime: "12 days",
        },
      },
      {
        label: "CPU",
        serviceType: "glances-percpu",
        cachedWidgetData: { cores: 16, coreUsages: Array(16).fill(24), maxCore: 24, avgCpu: 24 },
      },
      {
        label: "Downloads",
        serviceType: "qbittorrent",
        cachedWidgetData: {
          downSpeed: "2 MB/s",
          upSpeed: "0 B/s",
          activeDownloads: 1,
          queued: 0,
          showDownloads: true,
          downloads: [
            {
              title: "A long download title that belongs in details",
              progress: 60,
              activity: "Downloading",
            },
          ],
        },
      },
      {
        label: "Unavailable",
        serviceType: "whisparr",
        cachedWidgetData: { _status: "error", _statusText: "Service unavailable" },
      },
    ],
  },
];

test("keeps the default dashboard compact, aligned, and usable in both themes", async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await seedAndAuth(page, { groups });
  await page.goto("/");
  const cards = page.getByTestId("item-card");
  await expect(cards).toHaveCount(6);
  await expect(
    cards.filter({ hasText: "Glances" }).getByText("Uptime", { exact: true }),
  ).toHaveCount(0);
  await expect(cards.filter({ hasText: "CPU" }).getByText("CPU 5", { exact: true })).toHaveCount(0);
  await expect(page.getByText("A long download title that belongs in details")).toBeHidden();
  const heights = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().height),
  );
  expect(Math.max(...heights) - Math.min(...heights)).toBeLessThan(2);
  await page.screenshot({
    path: "test-results/dashboard-dark.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.getByRole("button", { name: "Theme settings" }).click();
  await page.getByRole("menuitemradio", { name: "Light", exact: true }).click();
  await expect(page.locator("html")).toHaveCSS("color-scheme", "light");
  await expect(page.getByRole("menuitemradio", { name: "Light", exact: true })).toBeHidden();
  await page.screenshot({
    path: "test-results/dashboard-light.png",
    fullPage: true,
    animations: "disabled",
  });
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({
    path: "test-results/dashboard-mobile.png",
    fullPage: true,
    animations: "disabled",
  });
});

test("supports hiding every metric, restoring from unused, and saving more than four", async ({
  page,
}) => {
  await seedAndAuth(page, { groups: [{ name: "System", items: [groups[0].items[2]] }] });
  await page.goto("/edit");
  await page.getByLabel("Edit item").click();
  const dialog = page.getByRole("dialog", { name: "Edit Item" });
  for (const label of ["CPU", "RAM", "Swap", "Load"])
    await dialog.getByRole("button", { name: `Hide ${label}`, exact: true }).click();
  await expect(dialog.getByText("Shown (0)")).toBeVisible();
  await expect(dialog.getByLabel("Shown stat cards")).toBeVisible();
  await dialog.getByRole("button", { name: "Update", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByLabel("Edit item").click();
  await expect(dialog.getByText("Shown (0)")).toBeVisible();
  for (const label of ["CPU", "RAM", "Swap", "Load", "Uptime"])
    await dialog.getByRole("button", { name: `Show ${label}`, exact: true }).click();
  await dialog.getByRole("button", { name: "Update", exact: true }).click();
  await expect(dialog).toBeHidden();
  await page.getByRole("button", { name: "Done", exact: true }).click();
  await expect(page.getByTestId("item-card").getByText("Uptime", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByTestId("item-card").getByText("Uptime", { exact: true })).toBeVisible();
});

test("shows the age of successful data after a newer failed update and opens details by keyboard", async ({
  page,
}) => {
  await seedAndAuth(page, { groups: [{ name: "Media", items: [groups[0].items[0]] }] });
  await page.goto("/");
  const itemId = await page.getByTestId("item-card").getAttribute("data-item-id");
  const observedAt = Date.now() + 1000;
  await page.route("**/api/events", (route) =>
    route.fulfill({
      contentType: "text/event-stream",
      body: `data: ${JSON.stringify({ type: "update", itemId, widgetData: { _status: "warn", _statusText: "Upstream unavailable", queued: 0, missing: 31, wanted: 107, movies: 629 }, pingStatus: null, fetchedAt: observedAt, observationUpdatedAt: observedAt, lastSuccessAt: observedAt - 3_660_000, lastAttemptAt: observedAt, freshness: "stale", configurationRevision: 0 })}\n\n`,
    }),
  );
  await page.reload();
  const card = page.getByTestId("item-card");
  await expect(card.getByText("Update failed", { exact: true })).toBeVisible();
  await expect(card.getByText("1h old", { exact: true })).toBeVisible();
  await expect(card.getByText("Movies", { exact: true })).toBeVisible();
  const summary = card.locator("summary").last();
  await summary.focus();
  await page.keyboard.press("Enter");
  await expect(card.getByText("Last successful update 1 hour ago.", { exact: true })).toBeVisible();
  await expect(card.getByText("Last attempt just now.", { exact: true })).toBeVisible();
});

test("reports a failed first live connection", async ({ page }) => {
  await seedAndAuth(page, {
    groups: [{ name: "Links", items: [{ label: "Example", href: "https://example.test" }] }],
  });
  await page.route("**/api/events", (route) => route.abort());
  await page.goto("/");
  await expect(page.getByTestId("sse-banner")).toHaveText(
    "Live updates unavailable. Reconnecting…",
    { timeout: 7000 },
  );
});
