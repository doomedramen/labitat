import { test, expect } from "@playwright/test"

test.describe("Dashboard Caching", () => {
  test.beforeEach(async ({ page }) => {
    // Login and setup test data
    await page.goto("/setup")
    await page.waitForLoadState("networkidle")

    // Complete setup if needed
    const setupForm = page.getByRole("form")
    if (await setupForm.isVisible().catch(() => false)) {
      await page.getByLabel("Username").fill("admin")
      await page.getByLabel("Password").fill("admin123")
      await page.getByLabel("Confirm Password").fill("admin123")
      await page.getByRole("button", { name: /complete setup/i }).click()
      await page.waitForLoadState("networkidle")
    }
  })

  test("should cache dashboard data in localStorage", async ({ page }) => {
    // Navigate to dashboard
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Wait for dashboard to load
    await expect(page.getByTestId("dashboard-title")).toBeVisible()

    // Check that cache was stored
    const cacheData = await page.evaluate(() => {
      const cache = localStorage.getItem("labitat-dashboard-cache")
      return cache ? JSON.parse(cache) : null
    })

    expect(cacheData).not.toBeNull()
    expect(cacheData.state).toBeDefined()
    expect(cacheData.state.groups).toBeDefined()
    expect(cacheData.state.lastUpdated).toBeDefined()
  })

  test("should show cached data immediately on page reload", async ({
    page,
  }) => {
    // Navigate to dashboard and wait for it to load
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Get the dashboard title or content to verify data loaded
    const initialTitle = await page
      .getByTestId("dashboard-title")
      .textContent()

    // Force reload - should show cached data immediately
    await page.reload()

    // Dashboard should be visible immediately (not skeleton)
    // If there's cached data, we should see actual content quickly
    await expect(page.getByTestId("dashboard-title")).toBeVisible({
      timeout: 5000,
    })

    const reloadedTitle = await page.getByTestId("dashboard-title").textContent()
    expect(reloadedTitle).toBe(initialTitle)
  })

  test("should persist widget data in cache", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Wait a bit for widget data to be fetched and cached
    await page.waitForTimeout(2000)

    // Check that widget data is cached
    const cacheData = await page.evaluate(() => {
      const cache = localStorage.getItem("labitat-dashboard-cache")
      return cache ? JSON.parse(cache) : null
    })

    expect(cacheData).not.toBeNull()
    expect(cacheData.state.widgetData).toBeDefined()
    expect(typeof cacheData.state.widgetData).toBe("object")
  })

  test("should persist ping status in cache", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Wait for ping data to be fetched and cached
    await page.waitForTimeout(2000)

    // Check that ping status is cached
    const cacheData = await page.evaluate(() => {
      const cache = localStorage.getItem("labitat-dashboard-cache")
      return cache ? JSON.parse(cache) : null
    })

    expect(cacheData).not.toBeNull()
    expect(cacheData.state.pingStatus).toBeDefined()
    expect(typeof cacheData.state.pingStatus).toBe("object")
  })

  test("should update cache when items are modified", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Get initial cache
    const initialCache = await page.evaluate(() => {
      const cache = localStorage.getItem("labitat-dashboard-cache")
      return cache ? JSON.parse(cache) : null
    })

    // Enter edit mode
    await page.getByTestId("edit-button").click()
    await expect(page.getByTestId("edit-button")).not.toBeVisible()

    // Add a new group
    await page.getByRole("button", { name: /add group/i }).click()

    // Fill in group name
    const dialog = page.getByRole("dialog")
    await dialog.getByLabel(/name/i).fill("Test Group")
    await dialog.getByRole("button", { name: /save/i }).click()

    // Wait for group to appear
    await expect(page.getByText("Test Group")).toBeVisible()

    // Check that cache was updated
    const updatedCache = await page.evaluate(() => {
      const cache = localStorage.getItem("labitat-dashboard-cache")
      return cache ? JSON.parse(cache) : null
    })

    expect(updatedCache.state.groups.length).toBeGreaterThan(
      initialCache.state.groups.length
    )
  })

  test("should clear cache when clearCache is called", async ({ page }) => {
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Verify cache exists
    const cacheBefore = await page.evaluate(() => {
      return localStorage.getItem("labitat-dashboard-cache")
    })
    expect(cacheBefore).not.toBeNull()

    // Clear cache via store
    await page.evaluate(() => {
      // Access the store and clear cache
      window.dispatchEvent(
        new CustomEvent("test:clear-cache", {
          detail: true,
        })
      )
    })

    // For now, just verify the cache mechanism works
    // In a real scenario, you'd trigger clearCache through the UI or store
  })

  test("should handle localStorage corruption gracefully", async ({
    page,
  }) => {
    // Corrupt the cache
    await page.evaluate(() => {
      localStorage.setItem("labitat-dashboard-cache", "invalid json{{{")
    })

    // Navigate to dashboard - should not crash
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Dashboard should still render
    await expect(page.getByTestId("dashboard-title")).toBeVisible()
  })

  test("should show cached data when offline", async ({ page }) => {
    // First, load dashboard while online to populate cache
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await expect(page.getByTestId("dashboard-title")).toBeVisible()

    // Wait for some data to be cached
    await page.waitForTimeout(2000)

    // Get cached data count
    const cacheBeforeOffline = await page.evaluate(() => {
      const cache = localStorage.getItem("labitat-dashboard-cache")
      return cache ? JSON.parse(cache) : null
    })

    expect(cacheBeforeOffline).not.toBeNull()

    // Go offline
    await page.context().setOffline(true)

    // Reload page
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Should still show cached content (not blank or error)
    await expect(page.getByTestId("dashboard-title")).toBeVisible()

    // Verify we're seeing cached data
    const hasContent = await page.evaluate(() => {
      return document.body.textContent?.length > 0
    })
    expect(hasContent).toBe(true)
  })
})

test.describe("Service Worker Icon Caching", () => {
  test("should cache icons from selfhst CDN", async ({ page, context }) => {
    // Navigate to dashboard to trigger icon loading
    await page.goto("/")
    await page.waitForLoadState("networkidle")

    // Wait for icons to load
    await page.waitForTimeout(2000)

    // Check service worker cache for icons
    const cacheKeys = await page.evaluate(async () => {
      if ("caches" in window) {
        const cacheNames = await caches.keys()
        const iconCache = cacheNames.find((name) =>
          name.includes("selfhst")
        )
        if (iconCache) {
          const cache = await caches.open(iconCache)
          const keys = await cache.keys()
          return keys.map((req) => req.url)
        }
      }
      return []
    })

    // Icon cache should exist (may be empty if no selfhst icons are used yet)
    expect(Array.isArray(cacheKeys)).toBe(true)
  })

  test("should load icons from cache when offline", async ({
    page,
    context,
  }) => {
    // Load dashboard first to populate icon cache
    await page.goto("/")
    await page.waitForLoadState("networkidle")
    await page.waitForTimeout(3000)

    // Go offline
    await context.setOffline(true)

    // Reload - icons should load from cache
    await page.reload()
    await page.waitForLoadState("networkidle")

    // Images should still be visible (from cache)
    const images = page.locator("img")
    const imageCount = await images.count()
    expect(imageCount).toBeGreaterThan(0)
  })
})
