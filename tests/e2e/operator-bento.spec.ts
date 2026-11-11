import { expect, seedAndAuth, test } from "../fixtures";
import { manage } from "../helpers/operator";

const sonarrData = {
  _status: "ok",
  queued: 3,
  missing: 1,
  wanted: 4,
  series: 187,
  enableQueue: true,
  showActiveDownloads: true,
  downloads: [
    { title: "S02E01", subtitle: "Foundation", progress: 64, size: "3.4 GB", timeLeft: "11m" },
    { title: "S02E03", subtitle: "Severance", progress: 28, size: "2.1 GB", timeLeft: "24m" },
  ],
};

test("a pinned service leads its bento group and keeps its place across activity updates", async ({
  page,
}) => {
  await page.setViewportSize({ width: 760, height: 920 });
  await page.route("**/api/events", (route) => route.abort());
  await seedAndAuth(page, {
    groups: [
      {
        name: "Services",
        items: [
          {
            label: "Proxmox",
            serviceType: "proxmox",
            href: "https://proxmox.test",
            cachedWidgetData: {
              _status: "ok",
              nodes: 3,
              vms: 14,
              runningVMs: 12,
              containers: 9,
              runningContainers: 9,
              cpuUsage: 31.7,
            },
          },
          {
            label: "Sonarr",
            serviceType: "sonarr",
            href: "https://sonarr.test",
            cachedWidgetData: sonarrData,
          },
          {
            label: "Media archive",
            serviceType: "plex",
            href: "https://plex.test",
            cachedWidgetData: {
              _status: "ok",
              streams: 0,
              albums: 806,
              movies: 2418,
              tvShows: 156,
            },
          },
          {
            label: "AdGuard Home",
            serviceType: "adguard",
            href: "https://adguard.test",
            cachedWidgetData: {
              _status: "ok",
              queries: 184392,
              blocked: 28473,
              blockedPercent: 15.4,
              latency: 12,
            },
          },
          {
            label: "Backup server",
            serviceType: "proxmox",
            href: "https://backup.test",
            cachedWidgetData: { _status: "error", _statusText: "Connection timed out" },
          },
        ],
      },
    ],
  });
  await page.goto("/");
  const cards = page.getByTestId("item-card");
  await expect(cards.first()).toContainText("Proxmox");

  await manage(page, "Featured service");
  const editor = page.getByRole("dialog", { name: "Featured service" });
  await editor
    .getByRole("combobox", { name: "Service", exact: true })
    .selectOption({ label: "Sonarr" });
  await editor.getByRole("button", { name: "Save featured service" }).click();
  await expect(editor).toBeHidden();
  await expect(cards.first()).toContainText("Sonarr");
  await expect(cards.first().getByRole("progressbar", { name: "S02E01" })).toHaveAttribute(
    "aria-valuenow",
    "64",
  );
  await expect(page.getByText("Foundation · S02E01", { exact: true })).toHaveCount(1);

  const boxes = await cards.evaluateAll((elements) =>
    elements.map((card) => card.getBoundingClientRect().toJSON()),
  );
  expect(boxes[0].top).toBe(boxes[1].top);
  expect(boxes[0].bottom).toBe(boxes[2].bottom);
  expect(boxes[1].x).toBe(boxes[2].x);
  expect(boxes[0].x).toBeLessThan(boxes[1].x);
  await page
    .locator("section[data-group-id]")
    .screenshot({ path: "test-results/bento-desktop.png" });

  await page.setViewportSize({ width: 320, height: 820 });
  const mobile = await cards.evaluateAll((elements) =>
    elements.map((card) => card.getBoundingClientRect().toJSON()),
  );
  expect(new Set(mobile.map((box) => box.x)).size).toBe(1);
  expect(mobile[0].bottom).toBeLessThan(mobile[1].top);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.mouse.move(0, 0);
  await page
    .locator("section[data-group-id]")
    .screenshot({ path: "test-results/bento-mobile.png" });
  await page.setViewportSize({ width: 760, height: 920 });

  const id = await cards.first().getAttribute("data-item-id");
  await page.unroute("**/api/events");
  await page.route("**/api/events", (route) => {
    const now = Date.now();
    return route.fulfill({
      contentType: "text/event-stream",
      body: `data: ${JSON.stringify({
        type: "update",
        itemId: id,
        widgetData: { ...sonarrData, downloads: [] },
        pingStatus: null,
        fetchedAt: now,
        observationUpdatedAt: now,
        lastSuccessAt: now,
        lastAttemptAt: now,
        freshness: "fresh",
        configurationRevision: 0,
      })}\n\n`,
    });
  });
  await page.reload();
  await expect(cards.first()).toContainText("Sonarr");
  await expect(cards.first()).toContainText("No downloads to show");
  await expect(cards.first()).toHaveAttribute("data-featured", "true");

  await page.getByRole("searchbox", { name: "Find a service" }).fill("Sonarr");
  await expect(cards).toHaveCount(1);
  expect((await cards.first().boundingBox())!.width).toBeGreaterThan(boxes[0].width);
  await page.getByRole("searchbox", { name: "Find a service" }).fill("");
  await page.setViewportSize({ width: 320, height: 820 });

  await manage(page, "Featured service");
  await editor
    .getByRole("combobox", { name: "Service", exact: true })
    .selectOption({ label: "None" });
  await editor.getByRole("button", { name: "Save featured service" }).click();
  await expect(editor).toBeHidden();
  await expect(cards.first()).toContainText("Proxmox");
  await page.reload();
  await expect(page.locator("[data-featured]")).toHaveCount(0);
});
