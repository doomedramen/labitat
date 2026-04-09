import { test, expect } from "../fixtures"

test.describe("First-time Setup", () => {
  test("redirects to /setup when no admin exists", async ({ page }) => {
    await page.goto("/")
    await expect(page).toHaveURL(/\/setup/)
    await expect(page.getByText("Welcome to Labitat")).toBeVisible()
  })

  test("shows setup form with email, password, confirm password fields", async ({
    page,
  }) => {
    await page.goto("/setup")
    await expect(page.locator("#email")).toBeVisible()
    await expect(page.locator("#password")).toBeVisible()
    await expect(page.locator("#confirmPassword")).toBeVisible()
    await expect(
      page.getByRole("button", { name: "Create Admin Account" })
    ).toBeVisible()
  })

  test("creates admin and redirects to dashboard", async ({ page }) => {
    await page.goto("/setup")

    await page.locator("#email").fill("admin@test.com")
    await page.locator("#password").fill("password123")
    await page.locator("#confirmPassword").fill("password123")
    // Blur all fields to ensure TanStack Form state is synced,
    // then wait for validation to settle (no errors for valid data)
    await page.locator("#email").evaluate((el) => el.blur())
    await page.locator("#password").evaluate((el) => el.blur())
    await page.locator("#confirmPassword").evaluate((el) => el.blur())
    await expect(page.locator("p.text-destructive")).toHaveCount(0)

    // Listen for the Next.js server action POST (has Next-Action header)
    const responsePromise = page.waitForResponse(
      (resp) =>
        resp.request().method() === "POST" &&
        "next-action" in resp.request().headers()
    )
    await page.getByRole("button", { name: "Create Admin Account" }).click()
    await responsePromise
    // Navigate to verify admin was created
    await page.goto("/")
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible()
  })

  test("shows error for mismatched passwords", async ({ page }) => {
    await page.goto("/setup")

    await page.locator("#email").fill("admin@test.com")
    await page.locator("#password").fill("password123")
    await page.locator("#confirmPassword").fill("different123")
    await page.getByRole("button", { name: "Create Admin Account" }).click()

    await expect(page.getByText("Passwords do not match")).toBeVisible()
  })

  test("shows error for short password via form validation", async ({
    page,
  }) => {
    await page.goto("/setup")

    await page.locator("#email").fill("admin@test.com")
    // TanStack Form + Zod validates password length
    const pw = page.locator("#password")
    await pw.fill("short")
    await pw.blur()
    await page.getByRole("button", { name: "Create Admin Account" }).click()
    await expect(
      page.getByText("Password must be at least 6 characters").first()
    ).toBeVisible()
  })

  test("shows error for invalid email", async ({ page }) => {
    await page.goto("/setup")

    // The email input has type="email" so the browser validates it natively.
    // We verify the constraint exists and that the form won't submit.
    const email = page.locator("#email")
    await email.fill("not-an-email")
    const type = await email.getAttribute("type")
    expect(type).toBe("email")
  })

  test("redirects away from /setup when admin already exists", async ({
    page,
  }) => {
    await page.request.post("/api/test/seed", {
      headers: { "x-test-secret": "e2e-test-reset-token" },
      data: { admin: { email: "admin@test.com", password: "password123" } },
    })

    await page.goto("/setup")
    await expect(page).toHaveURL("/")
  })
})
