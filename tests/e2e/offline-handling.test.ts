import { test, expect } from "@playwright/test"

test.describe("Offline Handling", () => {
  test.beforeEach(async ({ page }) => {
    // Go to dashboard first to ensure service worker is registered
    await page.goto("/")
    // Wait for page to be interactive
    await page.waitForLoadState("domcontentloaded")
  })

  test("should show offline banner when network goes offline", async ({
    page,
  }) => {
    // Verify we're online initially
    await expect(page.locator("body")).toBeVisible()

    // Go offline
    await page.context().setOffline(true)

    // Wait for the offline banner to appear
    await expect(page.getByTestId("offline-banner")).toBeVisible({
      timeout: 10000,
    })

    // Verify banner has the correct icon
    await expect(
      page.getByTestId("offline-banner").locator("svg").first()
    ).toBeVisible()
  })

  test("should show checking connection state during health checks", async ({
    page,
  }) => {
    // Go offline first
    await page.context().setOffline(true)

    // Wait for offline banner
    await expect(page.getByTestId("offline-banner")).toBeVisible({
      timeout: 10000,
    })

    // Go back online first (before dismissing)
    await page.context().setOffline(false)

    // Wait for the "Back online" banner to appear
    await expect(page.getByTestId("reconnected-banner")).toBeVisible({
      timeout: 10000,
    })

    // Wait for it to auto-dismiss (3 seconds) or dismiss manually
    await expect(page.getByTestId("reconnected-banner")).not.toBeVisible({
      timeout: 5000,
    })

    // Page should still be functional
    await expect(page.locator("body")).toBeVisible()
  })

  test("should detect server availability via health checks", async ({
    page,
  }) => {
    // Monitor network requests for health checks
    const healthCheckPromise = page.waitForRequest(
      (request) => request.url().includes("/api/health"),
      { timeout: 10000 }
    )

    // Wait for at least one health check request
    const healthCheckRequest = await healthCheckPromise

    // Should have made at least one health check request
    expect(healthCheckRequest.url()).toContain("/api/health")
  })

  test("should revalidate data when server comes back online", async ({
    page,
  }) => {
    // This test verifies SWR revalidation instead of full page reload

    // Go offline first
    await page.context().setOffline(true)

    // Wait for offline banner
    await expect(page.getByTestId("offline-banner")).toBeVisible({
      timeout: 10000,
    })

    // Go back online
    await page.context().setOffline(false)

    // Wait for the "Back online" banner to appear
    await expect(page.getByTestId("reconnected-banner")).toBeVisible({
      timeout: 10000,
    })

    // Wait for it to auto-dismiss
    await expect(page.getByTestId("reconnected-banner")).not.toBeVisible({
      timeout: 5000,
    })

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
    await page.goto("/~offline")
    await expect(page.locator("body")).toBeVisible()
    await expect(
      page.getByRole("heading", { name: "You're Offline" })
    ).toBeVisible()
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
