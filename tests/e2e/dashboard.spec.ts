import { test, expect, seedAndAuth, SEED_GROUPS } from "../fixtures";

test.describe("Dashboard", () => {
  test("shows empty dashboard with default title", async ({ page }) => {
    // Need an admin so the page doesn't redirect to /setup
    await page.request.post("/api/test/seed", {
      headers: { "x-test-secret": "e2e-test-reset-token" },
      data: { admin: { email: "admin@test.com", password: "password123" } },
    });
    await page.context().clearCookies();
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Labitat");
  });

  test("shows Sign in button when not authenticated", async ({ page }) => {
    await page.request.post("/api/test/seed", {
      headers: { "x-test-secret": "e2e-test-reset-token" },
      data: { admin: { email: "admin@test.com", password: "password123" } },
    });
    await page.context().clearCookies();
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  });

  test.skip("shows Edit button when authenticated", async ({ page }) => {
    // TODO: Fix seedAndAuth fixture - session not being set correctly in production mode
    await seedAndAuth(page);
    await page.goto("/");
    await expect(page.getByRole("button", { name: "Edit" })).toBeVisible();
  });

  test.skip("displays seeded groups and items", async ({ page }) => {
    // TODO: Fix seedAndAuth fixture - session not being set correctly in production mode
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    await expect(page.getByText("Infrastructure")).toBeVisible();
    await expect(page.getByText("Media")).toBeVisible();
    await expect(page.getByText("Proxmox")).toBeVisible();
    await expect(page.getByText("Grafana")).toBeVisible();
    await expect(page.getByText("Jellyfin")).toBeVisible();
  });

  test.skip("items with href are clickable links", async ({ page }) => {
    // TODO: Fix seedAndAuth fixture - session not being set correctly in production mode
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    const proxmoxLink = page.getByRole("link", { name: /Proxmox/ });
    await expect(proxmoxLink).toBeVisible();
    await expect(proxmoxLink).toHaveAttribute("href", "https://proxmox.test");
  });

  test.skip("displays custom dashboard title from settings", async ({ page }) => {
    // TODO: Fix seedAndAuth fixture - session not being set correctly in production mode
    await seedAndAuth(page, {
      settings: { dashboardTitle: "My Homelab" },
    });
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("My Homelab");
  });
});
