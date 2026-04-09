import { test, expect, seedAndAuth } from "../fixtures"

test.describe("Offline Page", () => {
  test("renders offline page with correct content", async ({ page }) => {
    // Seed admin so redirect to /setup doesn't interfere
    await seedAndAuth(page)
    // Block /api/health to prevent immediate redirect
    await page.route("**/api/health", (route) =>
      route.fulfill({ status: 503, body: "unavailable" })
    )

    await page.goto("/~offline")
    await expect(
      page.getByRole("heading", { name: "Service unavailable" })
    ).toBeVisible()
  })

  test("redirects to / when health check succeeds", async ({ page }) => {
    await seedAndAuth(page)
    // Allow health check to pass
    await page.goto("/~offline")
    await expect(page).toHaveURL("/", { timeout: 10_000 })
  })
})
