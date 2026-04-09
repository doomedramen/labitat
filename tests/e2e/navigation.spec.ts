import { test, expect, seedAndAuth } from "../fixtures"

test.describe("Navigation & Middleware", () => {
  test("/api/health returns ok status", async ({ page }) => {
    const response = await page.request.get("/api/health")
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body.status).toBe("ok")
  })

  test("visiting /setup with no admin shows setup page", async ({ page }) => {
    await page.goto("/setup")
    await expect(page.getByText("Welcome to Labitat")).toBeVisible()
    await expect(page.getByLabel("Email")).toBeVisible()
  })

  test("visiting /setup with admin redirects to /", async ({ page }) => {
    await seedAndAuth(page)
    await page.goto("/setup")
    await expect(page).toHaveURL("/")
  })

  test("visiting / with no admin redirects to /setup", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/setup/)
  })
})
