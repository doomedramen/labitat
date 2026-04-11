import { test, expect, seedAndAuth } from "../fixtures"
import { createPlaywrightMockAdapter } from "../helpers/adapter-mocks"
import { radarrMocks } from "../helpers/mocks/arr-adapters"

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
      },
    ],
  },
]

test.describe("Widget Rendering", () => {
  test("renders stat cards for a Radarr item", async ({ page }) => {
    const mockAdapter = createPlaywrightMockAdapter(page)
    mockAdapter.setup(
      ...radarrMocks.success(RADARR_URL, {
        queued: 5,
        missing: 3,
        wanted: 7,
        movies: 42,
      })
    )

    await seedAndAuth(page, { groups: SEED_RADARR_ITEM })
    await page.goto("/")

    // The item label should be visible
    await expect(page.getByText("Radarr")).toBeVisible()

    // Stat cards should render with the mocked values
    await expect(page.getByText("5").first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("3").first()).toBeVisible()
    await expect(page.getByText("7").first()).toBeVisible()
    await expect(page.getByText("42").first()).toBeVisible()

    // Stat labels should be present
    await expect(page.getByText("Queued")).toBeVisible()
    await expect(page.getByText("Missing")).toBeVisible()
    await expect(page.getByText("Wanted")).toBeVisible()
    await expect(page.getByText("Movies")).toBeVisible()

    mockAdapter.teardown()
  })

  test("shows error state when the service returns 500", async ({ page }) => {
    const mockAdapter = createPlaywrightMockAdapter(page)
    mockAdapter.setup(...radarrMocks.error(RADARR_URL, 500))

    await seedAndAuth(page, { groups: SEED_RADARR_ITEM })
    await page.goto("/")

    // The item should still appear
    await expect(page.getByText("Radarr")).toBeVisible()

    // An error status dot (red) should appear — rendered as a role="status" element
    const statusDot = page.locator('[role="status"]')
    await expect(statusDot).toBeVisible({ timeout: 15_000 })

    // The status dot should indicate an error state (red via bg-red-500 class)
    await expect(statusDot).toHaveClass(/bg-red-500/)

    mockAdapter.teardown()
  })

  test("refreshes data when navigating back to dashboard", async ({ page }) => {
    // The seed API doesn't support pollingMs directly; items default to 10000ms.
    // Since revalidateOnFocus is false and revalidateIfStale is true, navigating
    // away and back triggers a fresh fetch via SWR's mount revalidation.
    // We intercept requests and return different data on the second fetch to
    // confirm the widget updates with fresh values.

    let fetchCount = 0

    await page.route("**/*", async (route) => {
      const url = route.request().url()

      // Only intercept requests to the Radarr service
      if (!url.startsWith(RADARR_URL)) {
        return route.continue()
      }

      fetchCount++

      const useInitialData = fetchCount <= 4

      if (url.includes("/api/v3/queue")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            totalRecords: useInitialData ? 5 : 10,
            records: [],
          }),
        })
      } else if (url.includes("/api/v3/movie")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(
            Array.from({ length: useInitialData ? 10 : 20 }, (_, i) => ({
              id: i + 1,
              title: `Movie ${i + 1}`,
            }))
          ),
        })
      } else if (url.includes("/api/v3/wanted/missing")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ totalRecords: 3 }),
        })
      } else if (url.includes("/api/v3/wanted/cutoff")) {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ totalRecords: 7 }),
        })
      } else {
        return route.continue()
      }
    })

    await seedAndAuth(page, { groups: SEED_RADARR_ITEM })
    await page.goto("/")

    // Wait for initial data: Queued=5, Movies=10
    await expect(page.getByText("5").first()).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText("10").first()).toBeVisible()

    // Navigate away and come back — triggers SWR revalidation on mount
    await page.goto("/settings")
    await page.waitForLoadState("networkidle")
    await page.goto("/")

    // The widget should now show refreshed data: Movies=20 (was 10)
    // Using a specific locator to avoid matching "20" in unrelated content
    const moviesStatCard = page
      .locator("div")
      .filter({ hasText: /^20$/ })
      .first()
    await expect(moviesStatCard).toBeVisible({ timeout: 15_000 })

    await page.unroute("**/*")
  })
})
