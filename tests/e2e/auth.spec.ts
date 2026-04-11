import { test, expect, seedAndAuth } from "../fixtures"

const ADMIN_EMAIL = "admin@test.com"
const ADMIN_PASSWORD = "password123"

test.describe("Authentication", () => {
  test.describe("Login", () => {
    test.beforeEach(async ({ page }) => {
      await page.request.post("/api/test/seed", {
        headers: { "x-test-secret": "e2e-test-reset-token" },
        data: { admin: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } },
      })
      await page.context().clearCookies()
    })

    test("opens login dialog when clicking Sign in", async ({ page }) => {
      await page.goto("/")
      await page.getByRole("button", { name: "Sign in" }).click()
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible()
      await expect(page.locator("#email")).toBeVisible()
      await expect(page.locator("#password")).toBeVisible()
    })

    test("logs in with valid credentials", async ({ page }) => {
      await page.goto("/")
      await page.getByRole("button", { name: "Sign in" }).click()

      const dialog = page.getByRole("dialog")
      await dialog.locator("#email").fill(ADMIN_EMAIL)
      await dialog.locator("#password").fill(ADMIN_PASSWORD)
      await dialog.getByRole("button", { name: "Sign in" }).click()

      await expect(page.getByRole("button", { name: "Edit" })).toBeVisible()
    })

    test("shows error for invalid credentials", async ({ page }) => {
      await page.goto("/")
      await page.getByRole("button", { name: "Sign in" }).click()

      const dialog = page.getByRole("dialog")
      await dialog.locator("#email").fill(ADMIN_EMAIL)
      await dialog.locator("#password").fill("wrongpassword")
      await dialog.getByRole("button", { name: "Sign in" }).click()

      await expect(page.getByText("Invalid email or password")).toBeVisible()
    })

    test("rate limits after 5 failed attempts", async ({ page }) => {
      await page.goto("/")
      await page.getByRole("button", { name: "Sign in" }).click()

      const dialog = page.getByRole("dialog")
      for (let i = 0; i < 5; i++) {
        await dialog.locator("#email").fill(ADMIN_EMAIL)
        await dialog.locator("#password").fill(`wrong${i}`)
        await dialog.getByRole("button", { name: "Sign in" }).click()
        // Wait for the server action to complete (button returns to "Sign in")
        await expect(
          dialog.getByRole("button", { name: "Sign in" })
        ).toBeEnabled()
      }

      // 6th attempt should be rate limited
      await dialog.locator("#email").fill(ADMIN_EMAIL)
      await dialog.locator("#password").fill("wrong6")
      await dialog.getByRole("button", { name: "Sign in" }).click()

      await expect(dialog.getByTestId("login-error")).toContainText(
        /Too many attempts|locked/
      )
    })
  })

  test.describe("Logout", () => {
    test("clicking Sign out button shows Sign in button", async ({ page }) => {
      await seedAndAuth(page)

      await page.goto("/")
      await expect(page.getByRole("button", { name: "Edit" })).toBeVisible()

      // Enter edit mode to reveal the edit bar with Sign out button
      await page.getByRole("button", { name: "Edit" }).click()
      await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible()

      await page.getByRole("button", { name: "Sign out" }).click()

      // After logout, should redirect to home and show Sign in
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
      await expect(page.getByRole("button", { name: "Edit" })).not.toBeVisible()
    })

    test("clearing session shows Sign in button", async ({ page }) => {
      await seedAndAuth(page)

      await page.goto("/")
      await expect(page.getByRole("button", { name: "Edit" })).toBeVisible()

      await page.context().clearCookies()
      await page.reload()
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()
    })
  })
})
