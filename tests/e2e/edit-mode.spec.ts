import { test, expect, seedAndAuth, SEED_GROUPS } from "../fixtures";
import { manage, configure } from "../helpers/operator";

test.beforeEach(async ({ page }) => {
  await seedAndAuth(page, { groups: SEED_GROUPS });
  await page.goto("/");
});
test("legacy edit links redirect into authenticated Arrange", async ({ page }) => {
  await page.goto("/edit");
  await expect(page).toHaveURL("/?arrange=1");
  await expect(page.getByRole("button", { name: "Save arrangement" })).toBeVisible();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page).toHaveURL("/");
});
test("unauthenticated edit links return to the dashboard", async ({ page }) => {
  await page.context().clearCookies();
  await page.goto("/edit");
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("button", { name: "Save arrangement" })).toHaveCount(0);
});
test("adds, renames, and deletes a group outside Arrange", async ({ page }) => {
  await manage(page, "Add group");
  await page.locator("#name").fill("Monitoring");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await page.getByRole("button", { name: "Manage group Monitoring", exact: true }).click();
  await page.getByRole("menuitem", { name: "Edit group", exact: true }).click();
  await page.locator("#name").fill("Servers");
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Servers", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Manage group Servers", exact: true }).click();
  await page.getByRole("menuitem", { name: "Delete group", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Servers", exact: true })).toHaveCount(0);
});
test("adds, configures, and deletes a service through details", async ({ page }) => {
  await page.getByRole("button", { name: "Manage group Media", exact: true }).click();
  await page.getByRole("menuitem", { name: "Add service", exact: true }).click();
  await page.locator("#label").fill("Home Assistant");
  await page.locator("#href").fill("https://hass.test");
  await page.getByRole("button", { name: "Create", exact: true }).click();
  await configure(page, "Home Assistant");
  await page.locator("#label").fill("Home");
  await page.getByRole("button", { name: "Update", exact: true }).click();
  await expect(
    page.getByRole("link", { name: "Home (opens in a new tab)", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Inspect Home", exact: true }).click();
  await page.getByRole("button", { name: "Delete", exact: true }).click();
  await page.getByRole("button", { name: "Confirm", exact: true }).click();
  await expect(page.getByRole("button", { name: "Inspect Home", exact: true })).toHaveCount(0);
});
test("selects an icon by catalog name", async ({ page }) => {
  await page
    .context()
    .route("**/api/icons", (route) =>
      route.fulfill({ json: [{ name: "13 Feet Ladder", slug: "13-feet-ladder" }] }),
    );
  await manage(page, "Add service");
  await page.getByText("Identity", { exact: true }).click();
  await page.getByRole("combobox", { name: "Icon", exact: true }).fill("13 feet");
  await page.getByRole("option", { name: "13 Feet Ladder" }).click();
  await expect(page.getByRole("combobox", { name: "Icon", exact: true })).toHaveValue(
    "13-feet-ladder",
  );
});
