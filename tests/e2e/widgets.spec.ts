import { test, expect, seedAndAuth } from "../fixtures"

const RADARR_URL = "https://radarr.test"

const SEED_RADARR_ITEM = [
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
]

test.describe("Widget Rendering", () => {
  test("renders stat cards for a Radarr item", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_RADARR_ITEM })
    await page.goto("/")

    // The item label should be visible
    await expect(page.getByText("Radarr")).toBeVisible()

    // Stat cards should render with the cached values.
    // The server action will fail (radarr.test is unreachable) but useItemData
    // falls back to the initial cached data, preserving the stat values.
    await expect(page.getByText("5").first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("3").first()).toBeVisible()
    await expect(page.getByText("7").first()).toBeVisible()
    await expect(page.getByText("42").first()).toBeVisible()

    // Stat labels should be present
    await expect(page.getByText("Queued")).toBeVisible()
    await expect(page.getByText("Missing")).toBeVisible()
    await expect(page.getByText("Wanted")).toBeVisible()
    await expect(page.getByText("Movies")).toBeVisible()
  })

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
    })
    await page.goto("/")

    // The item should still appear
    await expect(page.getByText("Radarr")).toBeVisible()

    // An error status dot (red) should appear — uses rounded-full class
    const statusDot = page.locator('[role="status"].rounded-full')
    await expect(statusDot).toBeVisible({ timeout: 15_000 })
    await expect(statusDot).toHaveClass(/bg-red-500/)
  })
})
