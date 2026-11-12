import { expect, test, seedAndAuth } from "../fixtures";

test("group navigation filters services and returns to the full dashboard", async ({ page }) => {
  await seedAndAuth(page, {
    groups: [
      { name: "Media", items: [{ label: "Plex", serviceType: "plex", href: "https://plex.test" }] },
      {
        name: "Downloads",
        items: [{ label: "Client", serviceType: "qbittorrent", href: "https://client.test" }],
      },
    ],
  });
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto("/");
  const picker = page.getByRole("combobox", { name: "Filter by group" });
  await picker.selectOption({ label: "Downloads" });
  await expect(page.getByTestId("item-card")).toHaveCount(1);
  await expect(page.getByTestId("item-card").filter({ hasText: "Client" })).toBeVisible();
  await picker.selectOption({ label: "All groups" });
  await expect(page.getByTestId("item-card")).toHaveCount(2);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test("24 services across three groups retain aligned desktop rows", async ({ page }) => {
  await seedAndAuth(page, {
    groups: Array.from({ length: 3 }, (_, group) => ({
      name: `Group ${group + 1}`,
      items: Array.from({ length: 8 }, (_, index) => ({
        label: `Service ${group + 1}-${index + 1}`,
        href: `https://service-${group}-${index}.test`,
        ...(group === 0 && index === 0
          ? {
              serviceType: "qbittorrent",
              cachedWidgetData: {
                _status: "ok",
                showDownloads: true,
                downloads: [],
                downSpeed: "0 B/s",
                upSpeed: "0 B/s",
                activeDownloads: 0,
                queued: 0,
              },
            }
          : {}),
        ...(group === 0 && index === 1
          ? {
              serviceType: "plex",
              cachedWidgetData: {
                _status: "ok",
                showActiveStreams: true,
                sessions: [],
                streams: 0,
                albums: 0,
                movies: 0,
                tvShows: 0,
              },
            }
          : {}),
      })),
    })),
  });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByTestId("item-card")).toHaveCount(24);
  const cards = page.getByTestId("item-card");
  const boxes = await cards.evaluateAll((elements) =>
    elements.map((element) => element.getBoundingClientRect().toJSON()),
  );
  const [first, peer, third, fourth, nextRow] = boxes;
  expect(first.top).toBe(peer.top);
  expect(first.height).toBe(peer.height);
  expect(third.top).toBeGreaterThan(first.bottom);
  expect(third.top).toBe(fourth.top);
  expect(nextRow.top).toBeGreaterThan(third.bottom);
  const linkRow = boxes.slice(8, 12);
  expect(new Set(linkRow.map((box) => box.top)).size).toBe(1);
  expect(new Set(linkRow.map((box) => box.left)).size).toBe(4);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(1440);
});

test("live activity shows download and stream details and opens the correct service", async ({
  page,
}) => {
  await seedAndAuth(page, {
    groups: [
      {
        name: "Media",
        items: [
          {
            label: "Plex",
            serviceType: "plex",
            cachedWidgetData: {
              _status: "ok",
              streams: 1,
              albums: 18,
              movies: 596,
              tvShows: 286,
              showActiveStreams: true,
              sessions: [
                { title: "A film", user: "Alex", progress: 60, duration: 120, state: "paused" },
              ],
            },
          },
        ],
      },
      {
        name: "Downloads",
        items: [
          {
            label: "Client",
            serviceType: "qbittorrent",
            cachedWidgetData: {
              _status: "ok",
              downSpeed: "2 MB/s",
              upSpeed: "0 B/s",
              activeDownloads: 4,
              queued: 0,
              showDownloads: true,
              downloads: Array.from({ length: 4 }, (_, i) => ({
                title: `Download ${i + 1}`,
                progress: i * 20,
                activity: "Downloading",
                speed: "2 MB/s",
              })),
            },
          },
        ],
      },
    ],
  });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Inspect Client: Download 1" })).toBeVisible();
  await expect(page.getByText("Plex · 1:00 / 2:00")).toBeVisible();
  await expect(page.getByText("Alex", { exact: true })).toBeVisible();
  await expect(page.getByText("Download 4")).toBeHidden();
  await page.getByRole("button", { name: "Show 2 more" }).click();
  await expect(page.getByText("Download 4")).toBeVisible();
  await page.screenshot({ path: "test-results/operator-activity-mobile.png", fullPage: true });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: "test-results/operator-activity-desktop.png", fullPage: true });
  await page.getByRole("button", { name: "Inspect Plex: A film" }).click();
  await expect(page.getByRole("dialog", { name: "Plex" })).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(page.getByRole("button", { name: "Inspect Plex: A film" })).toBeFocused();
});

test("idle mobile activity is compact and active downloads remain visible", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await seedAndAuth(page, {
    groups: [
      {
        name: "Media",
        items: [
          {
            label: "Client",
            serviceType: "qbittorrent",
            cachedWidgetData: { _status: "ok", showDownloads: true, downloads: [] },
          },
          {
            label: "Plex",
            serviceType: "plex",
            cachedWidgetData: {
              _status: "ok",
              showActiveStreams: true,
              sessions: [],
              streams: 0,
              albums: 0,
              movies: 0,
              tvShows: 0,
            },
          },
        ],
      },
    ],
  });
  await page.goto("/");
  const ids = await page
    .getByTestId("item-card")
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("data-item-id")));
  let busy = false;
  await page.route("**/api/events", (route) => {
    const at = Date.now() + 120_000;
    const data = [
      {
        _status: "ok",
        showDownloads: true,
        downloads: busy
          ? [{ title: "Example download", progress: 30, activity: "downloading" }]
          : [],
      },
      {
        _status: "ok",
        showActiveStreams: true,
        sessions: [],
        streams: 0,
        albums: 0,
        movies: 0,
        tvShows: 0,
      },
    ];
    return route.fulfill({
      contentType: "text/event-stream",
      body: ids
        .map(
          (itemId, index) =>
            `data: ${JSON.stringify({ type: "update", itemId, widgetData: data[index], pingStatus: null, fetchedAt: at, observationUpdatedAt: at, lastSuccessAt: at, lastAttemptAt: at, freshness: "fresh", configurationRevision: 0 })}\n\n`,
        )
        .join(""),
    });
  });
  await page.reload();
  await expect(page.getByText("No downloads or streams", { exact: true })).toBeVisible();
  const secondCard = (await page.getByTestId("item-card").nth(1).boundingBox())!;
  expect(secondCard.y + secondCard.height).toBeLessThanOrEqual(844);
  await page.screenshot({ path: "test-results/operator-idle-phone.png" });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  busy = true;
  await page.reload();
  await expect(
    page.getByRole("button", { name: "Inspect Client: Example download" }),
  ).toBeVisible();
  await expect(page.getByText("No downloads or streams", { exact: true })).toHaveCount(0);
});
