import { test, expect } from "@playwright/test"

const TEST_EMAIL = "admin@example.com"
const TEST_PASSWORD = "admin123"

/**
 * Opens the login dialog from the dashboard
 */
async function openLoginDialog(page: import("@playwright/test").Page) {
  await page.goto("/")
  await page.getByTestId("sign-in-link").click()
}

test.describe("Authentication", () => {
  test("should show login dialog to unauthenticated users", async ({
    page,
  }) => {
    await openLoginDialog(page)

    await expect(page.getByTestId("login-form")).toBeVisible()
    await expect(page.getByTestId("email-input")).toBeVisible()
    await expect(page.getByTestId("password-input")).toBeVisible()
    await expect(page.getByTestId("submit-button")).toBeVisible()
  })

  test("should login with valid credentials", async ({ page }) => {
    await openLoginDialog(page)

    await page.getByTestId("email-input").fill(TEST_EMAIL)
    await page.getByTestId("password-input").fill(TEST_PASSWORD)
    await page.getByTestId("submit-button").click()

    await page.waitForURL("/")
    await expect(page).toHaveURL("/")
    await expect(page.getByTestId("dashboard-title")).toBeVisible()
  })

  test("should show error with invalid credentials", async ({ page }) => {
    await openLoginDialog(page)

    await page.getByTestId("email-input").fill("wrong@example.com")
    await page.getByTestId("password-input").fill("wrongpassword")
    await page.getByTestId("submit-button").click()

    // Dialog should stay visible with error
    await expect(page.getByTestId("login-form")).toBeVisible()
    await expect(page.getByTestId("login-error")).toBeVisible()
  })

  test("should show error with empty credentials", async ({ page }) => {
    await openLoginDialog(page)

    // Try to submit without filling fields - HTML validation should block
    await page.getByTestId("submit-button").click()

    // Dialog should still be visible (HTML5 validation prevents submit)
    await expect(page.getByTestId("login-form")).toBeVisible()
  })

  test("should logout when clicking logout button", async ({ page }) => {
    // Login first via dialog
    await openLoginDialog(page)
    await page.getByTestId("email-input").fill(TEST_EMAIL)
    await page.getByTestId("password-input").fill(TEST_PASSWORD)
    await page.getByTestId("submit-button").click()
    await page.waitForURL("/")

    // Enter edit mode to show edit bar with logout
    await page.getByTestId("edit-button").click()

    // Click logout button in edit bar
    await page.getByTestId("logout-button").click()

    // Should redirect to home
    await page.waitForURL("/")
    // Login dialog should be accessible via sign-in button again
    await expect(page.getByTestId("sign-in-link")).toBeVisible()
  })
})

test.describe("Setup Wizard", () => {
  test("should redirect to home when admin already exists", async ({
    page,
  }) => {
    // The authenticated fixture already creates the admin,
    // so /setup should redirect to /
    await page.goto("/setup")
    await expect(page).toHaveURL("/")
  })
})
