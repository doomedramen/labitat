import { test, expect, seedAndAuth, SEED_GROUPS } from "../fixtures";

test.describe("Dashboard Title", () => {
  test("shows default title 'Labitat'", async ({ page }) => {
    await seedAndAuth(page);
    await page.goto("/");
    await expect(page.locator("h1")).toContainText("Labitat");
  });

  test("edits title in edit mode", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    await page.getByRole("button", { name: "Edit" }).click();

    const titleInput = page.getByRole("textbox");
    await titleInput.clear();
    await titleInput.fill("My Homelab");
    await page.keyboard.press("Enter");

    // Exit edit mode to see the h1
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.locator("h1")).toContainText("My Homelab");
  });

  test("title persists after page reload", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    await page.getByRole("button", { name: "Edit" }).click();
    const titleInput = page.getByRole("textbox");
    await titleInput.clear();
    await titleInput.fill("My Homelab");
    await page.keyboard.press("Enter");

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page.locator("h1")).toContainText("My Homelab");

    await page.reload();
    await expect(page.locator("h1")).toContainText("My Homelab");
  });
});
