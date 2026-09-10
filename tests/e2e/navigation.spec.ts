import { test, expect, seedAndAuth } from "../fixtures";

test.describe("Navigation & Middleware", () => {
  test("/api/health returns ok status", async ({ page }) => {
    const response = await page.request.get("/api/health");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("ok");
  });

  test("visiting /setup with no admin shows setup page", async ({ page }) => {
    await page.goto("/setup");
    await expect(page.getByText("Welcome to Labitat")).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
  });

  test("visiting /setup with admin redirects to /", async ({ page }) => {
    await seedAndAuth(page);
    await page.goto("/setup");
    await expect(page).toHaveURL("/");
  });

  test("visiting / with no admin redirects to /setup", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/setup/);
  });

  test("back and forward preserve saved structure without reload", async ({ page }) => {
    await seedAndAuth(page, {
      groups: [{ name: "Navigation Group", items: [{ label: "Navigation Item" }] }],
    });

    await page.goto("/");
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page).toHaveURL("/edit");
    await page.getByLabel("Edit group").click();
    await page.locator("#name").fill("Saved Navigation Group");
    await page.getByRole("button", { name: "Update" }).click();
    await page.getByRole("button", { name: "Done" }).click();

    await expect(page).toHaveURL("/");
    await expect(page.getByText("Saved Navigation Group")).toBeVisible();
    await page.goBack();
    await expect(page).toHaveURL("/edit");
    await expect(page.getByText("Saved Navigation Group")).toBeVisible();
    await page.goForward();
    await expect(page).toHaveURL("/");
    await expect(page.getByText("Saved Navigation Group")).toBeVisible();
  });
});
