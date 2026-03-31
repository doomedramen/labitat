import { test, expect } from "@playwright/test"

test.describe("Authentication", () => {
  test("should show login page to unauthenticated users", async ({ page }) => {
    await page.goto("/login")

    await expect(page).toHaveURL("/login")
    await expect(page.getByTestId("login-form")).toBeVisible()
    await expect(page.getByTestId("login-title")).toBeVisible()
    await expect(page.getByTestId("login-description")).toBeVisible()
    await expect(page.getByTestId("email-input")).toBeVisible()
    await expect(page.getByTestId("password-input")).toBeVisible()
    await expect(page.getByTestId("submit-button")).toBeVisible()
  })

  test("should redirect to dashboard when already logged in", async ({
    page,
  }) => {
    // First login
    await page.goto("/login")
    await page.getByTestId("email-input").fill("admin@example.com")
    await page.getByTestId("password-input").fill("admin123")
    await page.getByTestId("submit-button").click()
    await page.waitForURL("/")

    // Try to go to login page again - should redirect
    await page.goto("/login")
    await expect(page).toHaveURL("/")
  })

  test("should login with valid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.getByTestId("email-input").fill("admin@example.com")
    await page.getByTestId("password-input").fill("admin123")
    await page.getByTestId("submit-button").click()

    await page.waitForURL("/")
    await expect(page).toHaveURL("/")
    await expect(page.getByTestId("dashboard-title")).toBeVisible()
  })

  test("should show error with invalid credentials", async ({ page }) => {
    await page.goto("/login")

    await page.getByTestId("email-input").fill("wrong@example.com")
    await page.getByTestId("password-input").fill("wrongpassword")
    await page.getByTestId("submit-button").click()

    // Should stay on login page with error
    await expect(page).toHaveURL("/login")
    await expect(page.getByTestId("login-error")).toBeVisible()
  })

  test("should show error with empty credentials", async ({ page }) => {
    await page.goto("/login")

    // Try to submit without filling fields
    await page.getByTestId("submit-button").click()

    // Should stay on login page
    await expect(page).toHaveURL("/login")
  })

  test("should logout when clicking logout button", async ({ page }) => {
    // Login first
    await page.goto("/login")
    await page.getByTestId("email-input").fill("admin@example.com")
    await page.getByTestId("password-input").fill("admin123")
    await page.getByTestId("submit-button").click()
    await page.waitForURL("/")

    // Enter edit mode to show edit bar with logout
    await page.getByTestId("edit-button").click()

    // Click logout button in edit bar
    await page.getByTestId("logout-button").click()

    // Should redirect to login
    await page.waitForURL("/login")
    await expect(page.getByTestId("login-form")).toBeVisible()
  })
})
