import { test, expect, seedAndAuth, SEED_GROUPS } from "../fixtures";
import { manage } from "../helpers/operator";
test.beforeEach(async ({ page }) => {
  await seedAndAuth(page, { groups: SEED_GROUPS });
  await page.goto("/");
});
test("shows the default title", async ({ page }) => {
  await expect(page.locator("h1")).toHaveText("Labitat");
});
test("renames the dashboard and persists across reload", async ({ page }) => {
  await manage(page, "Rename dashboard");
  await page.getByRole("textbox", { name: "Dashboard title" }).fill("My Homelab");
  await page.getByRole("button", { name: "Save title" }).click();
  await expect(page.locator("h1")).toHaveText("My Homelab");
  await page.reload();
  await expect(page.locator("h1")).toHaveText("My Homelab");
});
test("keeps the title draft after failed saves", async ({ page }) => {
  await manage(page, "Rename dashboard");
  await page.route("**/*", (route) =>
    route.request().method() === "POST" && route.request().headers()["next-action"]
      ? route.abort()
      : route.continue(),
  );
  await page.getByRole("textbox", { name: "Dashboard title" }).fill("Keep this draft");
  await page.getByRole("button", { name: "Save title" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "Could not save" })).toContainText(
    "Could not save",
  );
  await expect(page.getByRole("textbox", { name: "Dashboard title" })).toHaveValue(
    "Keep this draft",
  );
});
