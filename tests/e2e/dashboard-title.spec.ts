import { test, expect, seedAndAuth, SEED_GROUPS } from "../fixtures";

test.describe("Dashboard Title", () => {
  test("shows default title 'Labitat'", async ({ page }) => {
    await seedAndAuth(page);
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Labitat");
  });

  test("edits title in edit mode", async ({ page }) => {
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

  test("title persists after page reload", async ({ page }) => {
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
