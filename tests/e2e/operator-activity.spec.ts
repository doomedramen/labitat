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
  const first = (await cards.nth(0).boundingBox())!;
  const peer = (await cards.nth(1).boundingBox())!;
  const fourth = (await cards.nth(3).boundingBox())!;
  const nextRow = (await cards.nth(4).boundingBox())!;
  expect(first.y).toBe(peer.y);
  expect(first.height).toBe(peer.height);
  expect(first.y).toBe(fourth.y);
  expect(nextRow.y).toBeGreaterThan(first.y);
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
