import { test, expect, seedAndAuth } from "../fixtures";
test("health is compact and failures have visible reasons", async ({ page }) => {
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
  await expect(healthy.getByRole("img", { name: "Healthy", exact: true })).toBeVisible();
  await expect(failed.getByRole("img", { name: "Needs attention", exact: true })).toBeVisible();
  await expect(failed.getByText("Connection refused", { exact: true })).toBeVisible();
  expect(await healthy.locator("footer").count()).toBe(0);
  expect(await healthy.locator("svg path[stroke-dashoffset]").count()).toBe(0);
});
