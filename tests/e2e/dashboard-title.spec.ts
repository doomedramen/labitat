import { test, expect, seedAndAuth, SEED_GROUPS } from "../fixtures";

test.describe("Dashboard Title", () => {
  test.skip("shows default title 'Labitat'", async ({ page }) => {
    // TODO: Fix seedAndAuth fixture - session not being set correctly in production mode
    await seedAndAuth(page);
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Labitat");
  });

  test.skip("edits title in edit mode", async ({ page }) => {
    // TODO: Fix seedAndAuth fixture - session not being set correctly in production mode
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/edit");

    const titleInput = page.getByRole("textbox");
    await titleInput.clear();
    await titleInput.fill("My Homelab");

    // Done returns to /
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.locator("h1")).toContainText("My Homelab");
  });

  test.skip("title persists after page reload", async ({ page }) => {
    // TODO: Fix seedAndAuth fixture - session not being set correctly in production mode
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/edit");
    const titleInput = page.getByRole("textbox");
    await titleInput.clear();
    await titleInput.fill("My Homelab");

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.locator("h1")).toContainText("My Homelab");

    await page.reload();
    await expect(page.locator("h1")).toContainText("My Homelab");
  });
});
