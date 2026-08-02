import { test, expect, seedAndAuth, SEED_GROUPS } from "../fixtures";

test.describe("Edit Mode", () => {
  test.beforeEach(async ({ page }) => {
    // TODO: Fix seedAndAuth fixture - session not being set correctly in production mode
    await seedAndAuth(page, { groups: SEED_GROUPS });
  });

  test("Edit navigates to /edit, Done returns to /", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Edit" }).click();
    await expect(page).toHaveURL("/edit");
    await expect(page.getByText("Drag to reorder. Select a card to edit it.")).toBeVisible();
    await expect(page.getByRole("button", { name: "Done" })).toBeVisible();

    await page.getByRole("button", { name: "Done" }).click();
    await expect(page).toHaveURL("/");
  });

  test("edit mode never opens SSE connection", async ({ page }) => {
    await page.goto("/edit");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("sse-banner")).not.toBeVisible();
    const count = await page.evaluate(() => window.__sseOpenCount ?? 0);
    expect(count).toBe(0);
  });

  test("shows Add group button in edit mode", async ({ page }) => {
    await page.goto("/edit");
    await expect(page.getByRole("button", { name: "Add group" })).toBeVisible();
  });

  test("shows edit and delete controls on groups", async ({ page }) => {
    await page.goto("/edit");
    await expect(page.getByLabel("Edit group").first()).toBeVisible();
    await expect(page.getByLabel("Delete group").first()).toBeVisible();
  });

  test("shows Add item button in each group", async ({ page }) => {
    await page.goto("/edit");
    const addButtons = page.getByRole("button", { name: "Add item" });
    await expect(addButtons).toHaveCount(2);
  });

  test("adds a new group", async ({ page }) => {
    await page.goto("/edit");
    await page.getByRole("button", { name: "Add group" }).click();

    await expect(page.getByRole("heading", { name: "New Group" })).toBeVisible();
    await page.locator("#name").fill("Monitoring");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.locator("h2", { hasText: "Monitoring" })).toBeVisible();
  });

  test("edits an existing group name", async ({ page }) => {
    await page.goto("/edit");
    await page.getByLabel("Edit group").first().click();

    await expect(page.getByRole("heading", { name: "Edit Group" })).toBeVisible();
    const nameInput = page.locator("#name");
    await nameInput.clear();
    await nameInput.fill("Servers");
    await page.getByRole("button", { name: "Update" }).click();

    await expect(page.locator("h2", { hasText: "Servers" })).toBeVisible();
  });

  test("deletes a group with confirmation", async ({ page }) => {
    await page.goto("/edit");
    await page.getByLabel("Delete group").first().click();

    await expect(page.getByRole("heading", { name: "Delete group" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(page.locator("h2", { hasText: "Infrastructure" })).not.toBeVisible();
    await expect(page.locator("h2", { hasText: "Media" })).toBeVisible();
  });

  test("adds a new item to a group", async ({ page }) => {
    await page.goto("/edit");
    await page.getByRole("button", { name: "Add item" }).first().click();

    await expect(page.getByRole("heading", { name: "New Item" })).toBeVisible();
    await page.locator("#label").fill("Home Assistant");
    await page.locator("#href").fill("https://hassio.test");
    await page.getByRole("button", { name: "Create" }).click();

    await expect(page.getByText("Home Assistant")).toBeVisible();
    await page.getByRole("button", { name: "Done" }).click();
    await expect(page).toHaveURL("/");
    await expect(page.getByTestId("item-card").filter({ hasText: "Home Assistant" })).toBeVisible();
  });

  test("selects an item icon by name from the selfh.st catalog", async ({ page }) => {
    await page.route("**/api/icons", (route) =>
      route.fulfill({
        contentType: "application/json",
        body: JSON.stringify([{ name: "13 Feet Ladder", slug: "13-feet-ladder" }]),
      }),
    );
    await page.goto("/edit");
    await page.getByRole("button", { name: "Add item" }).first().click();

    const icon = page.getByRole("combobox", { name: "Icon" });
    await icon.fill("13 feet");
    await page.getByRole("option", { name: "13 Feet Ladder" }).click();

    await expect(icon).toHaveValue("13-feet-ladder");
  });

  test("edits an existing item", async ({ page }) => {
    await page.goto("/edit");
    await page.getByLabel("Edit item").first().click();

    await expect(page.getByRole("heading", { name: "Edit Item" })).toBeVisible();
    const labelInput = page.locator("#label");
    await labelInput.clear();
    await labelInput.fill("Proxmox VE");
    await page.getByRole("button", { name: "Update" }).click();

    await expect(page.getByText("Proxmox VE")).toBeVisible();
  });

  test("deletes an item with confirmation", async ({ page }) => {
    await page.goto("/edit");
    await page.getByLabel("Delete item").first().click();

    await expect(page.getByRole("heading", { name: "Delete item" })).toBeVisible();
    await page.getByRole("button", { name: "Confirm" }).click();

    await expect(page.getByTestId("item-card").filter({ hasText: "Proxmox" })).toHaveCount(0);
    await expect(page.getByTestId("item-card").filter({ hasText: "Grafana" })).toBeVisible();
  });
});
