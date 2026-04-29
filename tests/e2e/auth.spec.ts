import { test, expect, seedAndAuth } from "../fixtures";

const ADMIN_EMAIL = "admin@test.com";
const ADMIN_PASSWORD = "password123";

test.describe("Authentication", () => {
  test.describe("Login", () => {
    test.beforeEach(async ({ page }) => {
      await page.request.post("/api/test/reset-db", {
        headers: { "x-test-secret": "e2e-test-reset-token" },
      });
      await page.request.post("/api/test/seed", {
        headers: { "x-test-secret": "e2e-test-reset-token" },
        data: { admin: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD } },
      });
      await page.context().clearCookies();
    });

    test("opens login dialog when clicking Sign in", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Sign in" }).click();
      await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
      await expect(page.locator("#email")).toBeVisible();
      await expect(page.locator("#password")).toBeVisible();
    });

    test("shows error for invalid credentials", async ({ page }) => {
      await page.goto("/");
      await page.getByRole("button", { name: "Sign in" }).click();

      const dialog = page.getByRole("dialog");
      await dialog.locator("#email").fill(ADMIN_EMAIL);
      await dialog.locator("#password").fill("wrongpassword");
      await dialog.getByRole("button", { name: "Sign in" }).click();

      await expect(dialog.getByText("Invalid email or password")).toBeVisible();
    });
  });

  test.describe("Logout", () => {
    test("clicking Sign out button shows Sign in button", async ({ page }) => {
      await seedAndAuth(page);
      await page.goto("/");
      await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();

      await page.goto("/edit");
      await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();

      await page.getByRole("button", { name: "Sign out" }).click();

      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
      await expect(page.getByRole("button", { name: "Edit" })).not.toBeVisible();
    });

    test("clearing session shows Sign in button", async ({ page }) => {
      await seedAndAuth(page);
      await page.goto("/");
      await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();

      await page.context().clearCookies();
      await page.reload();
      await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    });
  });
});
