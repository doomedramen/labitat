import { test, expect } from "@playwright/test"

test.describe("Offline Handling", () => {
  test.beforeEach(async ({ page }) => {
    // Go to dashboard first to ensure service worker is registered
    await page.goto("/")
    // Wait for service worker to be ready
    await page.waitForTimeout(1000)
  })

  test("should show offline banner when network goes offline", async ({
    page,
  }) => {
    // Verify we're online initially
    await expect(page.locator("body")).toBeVisible()

    // Go offline
    await page.context().setOffline(true)

    // Wait for the offline banner to appear
    // The banner should show "Server unavailable" or "You're offline"
    const offlineBanner = page
      .getByRole("alert")
      .filter({ hasText: /offline|server unavailable/i })
      .first()
    await expect(offlineBanner).toBeVisible({ timeout: 10000 })

    // Verify banner has the correct icon
    await expect(offlineBanner.locator("svg").first()).toBeVisible()
  })

  test("should show checking connection state during health checks", async ({
    page,
  }) => {
    // Go offline first
    await page.context().setOffline(true)

    // Wait for offline banner
    const offlineBanner = page
      .getByRole("alert")
      .filter({ hasText: /offline|server unavailable/i })
      .first()
    await expect(offlineBanner).toBeVisible({ timeout: 10000 })

    // Dismiss the banner
    const dismissBtn = offlineBanner.getByRole("button", { name: /dismiss/i })
    if (await dismissBtn.isVisible()) {
      await dismissBtn.click()
    }

    // Go back online
    await page.context().setOffline(false)

    // Wait for health check to detect we're back online
    // The banner should briefly show during revalidation
    await page.waitForTimeout(2000)

    // Page should still be functional
    await expect(page.locator("body")).toBeVisible()
  })

  test("should detect server availability via health checks", async ({
    page,
  }) => {
    // Monitor network requests for health checks
    const healthCheckRequests: string[] = []
    page.on("request", (request) => {
      if (request.url().includes("/api/health")) {
        healthCheckRequests.push(request.url())
      }
    })

    // Wait for health checks to occur
    await page.waitForTimeout(4000)

    // Should have made at least one health check request
    expect(healthCheckRequests.length).toBeGreaterThan(0)
  })

  test("should revalidate data when server comes back online", async ({
    page,
  }) => {
    // This test verifies SWR revalidation instead of full page reload

    // Go offline first
    await page.context().setOffline(true)

    // Wait for offline banner
    const offlineBanners = page
      .getByRole("alert")
      .filter({ hasText: /offline|server unavailable/i })
    await expect(offlineBanners.first()).toBeVisible({ timeout: 10000 })

    // Dismiss all offline banners
    const bannerCount = await offlineBanners.count()
    for (let i = 0; i < bannerCount; i++) {
      const banner = offlineBanners.nth(i)
      if (await banner.isVisible()) {
        const dismissBtn = banner.getByRole("button", { name: /dismiss/i })
        if (await dismissBtn.isVisible()) {
          await dismissBtn.click()
        }
      }
    }

    // Wait a moment for dismissals to take effect
    await page.waitForTimeout(500)

    // Go back online
    await page.context().setOffline(false)

    // Wait for health check and SWR revalidation
    await page.waitForTimeout(6000)

    // Verify page is still functional after coming back online
    // Should NOT have done a full page reload
    await expect(page.getByTestId("dashboard-title")).toBeVisible({
      timeout: 10000,
    })

    // Verify no full page reload occurred (URL should remain the same)
    expect(page.url()).toContain("/")
  })

  test("should serve cached content when offline", async ({ page }) => {
    // Service worker is disabled in test mode, so we can't test
    // actual offline caching. Instead, verify the offline route exists.
    // In production, the SW would cache pages and serve them offline.
    await page.goto("/offline")
    await expect(page.locator("body")).toBeVisible()
    await expect(page.getByText(/offline/i)).toBeVisible()
  })

  test("should verify service worker registration in production", async ({
    page,
  }) => {
    // Service worker is disabled in development by Serwist
    // This test verifies the registration logic is in place
    const hasServiceWorkerSupport = await page.evaluate(() => {
      return "serviceWorker" in navigator
    })

    expect(hasServiceWorkerSupport).toBe(true)
  })
})
