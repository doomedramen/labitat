import { test, expect, seedAndAuth } from "../fixtures";

const RADARR_URL = "https://radarr.test";

test.describe("Widget Rendering", () => {
  test("renders stat cards for a Radarr item", async ({ page }) => {
    await seedAndAuth(page, {
      groups: [
        {
          name: "Media",
          items: [
            {
              label: "Radarr",
              href: RADARR_URL,
              serviceType: "radarr",
              serviceUrl: RADARR_URL,
              cachedWidgetData: {
                queued: 5,
                missing: 3,
                wanted: 7,
                movies: 42,
              },
            },
          ],
        },
      ],
    });
    await page.goto("/");

    // The item label should be visible
    await expect(page.getByTestId("item-card").getByText("Radarr", { exact: true })).toBeVisible();

    // Stat cards should render with the cached values.
    // The server action will fail (radarr.test is unreachable) but useItemData
    // falls back to the initial cached data, preserving the stat values.
    await expect(page.getByText("5").first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("3").first()).toBeVisible();
    await expect(page.getByText("7").first()).toBeVisible();
    await expect(page.getByText("42").first()).toBeVisible();

    // Stat labels should be present
    await expect(page.getByText("Queued")).toBeVisible();
    await expect(page.getByText("Missing")).toBeVisible();
    await expect(page.getByText("Wanted")).toBeVisible();
    await expect(page.getByText("Movies")).toBeVisible();
  });

  test("shows error state when service is unreachable", async ({ page }) => {
    await seedAndAuth(page, {
      groups: [
        {
          name: "Media",
          items: [
            {
              label: "Radarr",
              href: RADARR_URL,
              serviceType: "radarr",
              serviceUrl: RADARR_URL,
              cachedWidgetData: {
                _status: "error",
                _statusText: "Connection refused",
              },
            },
          ],
        },
      ],
    });
    await page.goto("/");

    // The item should still appear
    await expect(page.getByTestId("item-card").getByText("Radarr", { exact: true })).toBeVisible();

    // An error status dot should appear with an accessible error label
    const radarrCard = page.getByTestId("item-card").filter({ hasText: "Radarr" });
    const statusDot = radarrCard.getByRole("img", { name: "Needs attention" });
    await expect(statusDot).toBeVisible({ timeout: 15_000 });
    await expect(statusDot).toHaveAttribute("aria-label", /Needs attention/i);
  });

  test("renders empty state with zero values", async ({ page }) => {
    await seedAndAuth(page, {
      groups: [
        {
          name: "Media",
          items: [
            {
              label: "Radarr",
              href: RADARR_URL,
              serviceType: "radarr",
              serviceUrl: RADARR_URL,
              cachedWidgetData: {
                queued: 0,
                missing: 0,
                wanted: 0,
                movies: 0,
              },
            },
          ],
        },
      ],
    });
    await page.goto("/");

    await expect(page.getByText("Radarr")).toBeVisible();

    // Stat labels should still render with zero values
    await expect(page.getByText("Movies")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Queued")).toBeVisible();
    await expect(page.getByText("Missing")).toBeVisible();
    await expect(page.getByText("Wanted")).toBeVisible();
  });

  test("renders multiple service widgets independently", async ({ page }) => {
    await seedAndAuth(page, {
      groups: [
        {
          name: "Media",
          items: [
            {
              label: "Radarr",
              href: "https://radarr.test",
              serviceType: "radarr",
              serviceUrl: "https://radarr.test",
              cachedWidgetData: {
                queued: 5,
                missing: 3,
                wanted: 7,
                movies: 42,
              },
            },
            {
              label: "Sonarr",
              href: "https://sonarr.test",
              serviceType: "sonarr",
              serviceUrl: "https://sonarr.test",
              cachedWidgetData: {
                queued: 10,
                missing: 1,
                wanted: 2,
                series: 30,
              },
            },
          ],
        },
      ],
    });
    await page.goto("/");

    // Both items should render
    await expect(page.getByText("Radarr")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("Sonarr")).toBeVisible();

    // Each item should render its own stat labels
    const radarrCard = page.getByTestId("item-card").filter({ hasText: "Radarr" });
    const sonarrCard = page.getByTestId("item-card").filter({ hasText: "Sonarr" });

    // Radarr-specific stat (unique to Radarr)
    await expect(radarrCard.getByText("Movies")).toBeVisible();
    // Sonarr-specific stat (unique to Sonarr)
    await expect(sonarrCard.getByText("Series")).toBeVisible();
  });

  test("renders link-only item without service widget", async ({ page }) => {
    await seedAndAuth(page, {
      groups: [
        {
          name: "Links",
          items: [
            {
              label: "My Link",
              href: "https://example.com",
            },
          ],
        },
      ],
    });
    await page.goto("/");

    // Item should appear as a simple link card — no service type, no widget
    await expect(page.getByText("My Link")).toBeVisible({ timeout: 15_000 });

    // No stat labels should appear
    await expect(page.getByText("Queued")).not.toBeVisible();

    // Should be a clickable link
    const link = page.locator("a", { hasText: "My Link" });
    await expect(link).toBeVisible();
  });

  test("Arrange keeps live metrics and health visible", async ({ page }) => {
    await seedAndAuth(page, {
      groups: [
        {
          name: "Media",
          items: [
            {
              label: "Radarr",
              serviceType: "radarr",
              cachedWidgetData: { _status: "ok", queued: 5, missing: 0, wanted: 0, movies: 42 },
            },
          ],
        },
      ],
    });
    await page.goto("/edit");
    await expect(page.getByText("Movies", { exact: true })).toBeVisible();
    await expect(page.getByRole("img", { name: "Healthy" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Save arrangement" })).toBeVisible();
  });
});

test("specialized Glances charts and processes render only in details", async ({ page }) => {
  const now = Date.now();
  await seedAndAuth(page, {
    groups: [
      {
        name: "System",
        items: [
          {
            label: "Trends",
            serviceType: "glances-timeseries",
            cachedWidgetData: {
              _status: "ok",
              history: [
                { timestamp: now - 60000, cpu: 10, mem: 40 },
                { timestamp: now, cpu: 12, mem: 42 },
              ],
            },
          },
          {
            label: "Processes",
            serviceType: "glances-processes",
            cachedWidgetData: {
              _status: "ok",
              sortBy: "cpu",
              processes: [{ name: "encoder", cpu: 80, memory: 5, pid: 42, status: "R" }],
            },
          },
        ],
      },
    ],
  });
  await page.goto("/");
  await expect(page.locator(".recharts-wrapper")).toHaveCount(0);
  await expect(page.getByText("encoder", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Inspect Trends", exact: true }).click();
  await expect(page.getByRole("dialog").locator(".recharts-wrapper").first()).toBeVisible();
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await page.getByRole("button", { name: "Inspect Processes", exact: true }).click();
  await expect(page.getByRole("dialog").getByText("encoder", { exact: true })).toBeVisible();
});
