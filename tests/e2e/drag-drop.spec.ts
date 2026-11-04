import { test, expect, seedAndAuth } from "../fixtures";
import { dragAndDropManual } from "../helpers/dnd";
test.beforeEach(async ({ page }) => {
  await seedAndAuth(page, {
    groups: [
      { name: "Group A", items: [{ label: "Item 1" }, { label: "Item 2" }, { label: "Item 3" }] },
      { name: "Group B", items: [] },
    ],
  });
  await page.goto("/edit");
});
test("stages dragged order without a write, Cancel restores it", async ({ page }) => {
  const posts: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.headers()["next-action"]) posts.push(request.url());
  });
  await dragAndDropManual(
    page,
    page.getByRole("button", { name: "Move service Item 3", exact: true }),
    page.getByRole("button", { name: "Move service Item 1", exact: true }),
  );
  await expect(page.getByTestId("item-card").first()).toContainText("Item 3");
  expect(posts).toHaveLength(0);
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(page.getByTestId("item-card").first()).toContainText("Item 1");
  await page.reload();
  await expect(page.getByTestId("item-card").first()).toContainText("Item 1");
});
test("saves group order and cross-group membership atomically", async ({ page }) => {
  await page.getByRole("button", { name: "Move group Group B earlier", exact: true }).click();
  await page
    .getByRole("combobox", { name: "Move Item 2 to group", exact: true })
    .selectOption({ label: "Group B" });
  await page.getByRole("button", { name: "Save arrangement", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.reload();
  await expect(page.locator("h2")).toHaveText(["Group B", "Group A"]);
  await expect(page.locator("section[data-group-id]").first().getByTestId("item-card")).toHaveCount(
    1,
  );
  await expect(page.getByTestId("item-card").first()).toContainText("Item 2");
});
test("preserves a failed save draft, prevents duplicate submits, and allows retry", async ({
  page,
}) => {
  await page.getByRole("button", { name: "Move Item 3 earlier", exact: true }).click();
  let writes = 0;
  await page.route("**/*", async (route) => {
    if (route.request().method() === "POST" && route.request().headers()["next-action"]) {
      writes++;
      await new Promise((resolve) => setTimeout(resolve, 200));
      await route.abort();
    } else await route.continue();
  });
  await page.getByRole("button", { name: "Save arrangement", exact: true }).dblclick();
  await expect(page.getByRole("alert").filter({ hasText: "Could not save" })).toContainText(
    "Could not save",
  );
  expect(writes).toBe(1);
  await expect(page.getByTestId("item-card").nth(1)).toContainText("Item 3");
  await page.unrouteAll();
  await page.getByRole("button", { name: "Save arrangement", exact: true }).click();
  await expect(page).toHaveURL("/");
  await page.reload();
  await expect(page.getByTestId("item-card").nth(1)).toContainText("Item 3");
});
test("rejects concurrent structural edits without overwriting them", async ({ page, context }) => {
  const other = await context.newPage();
  await other.goto("/edit");
  await page.getByRole("button", { name: "Move Item 2 earlier", exact: true }).click();
  await page.getByRole("button", { name: "Save arrangement", exact: true }).click();
  await expect(page).toHaveURL("/");
  await other.getByRole("button", { name: "Move Item 3 earlier", exact: true }).click();
  await other.getByRole("button", { name: "Save arrangement", exact: true }).click();
  await expect(other.getByRole("alert").filter({ hasText: "changed elsewhere" })).toContainText(
    "changed elsewhere",
  );
  await expect(other.getByRole("button", { name: "Save arrangement", exact: true })).toBeDisabled();
  await other
    .getByRole("button", { name: "Reload latest (discard arrangement)", exact: true })
    .click();
  await expect(other.getByTestId("item-card").first()).toContainText("Item 2");
  await other.close();
});
test("Escape cancels an in-progress drag", async ({ page }) => {
  const handle = page.getByRole("button", { name: "Move service Item 1", exact: true });
  const box = (await handle.boundingBox())!;
  await page.mouse.move(box.x + 10, box.y + 10);
  await page.mouse.down();
  await page.mouse.move(box.x + 30, box.y + 30);
  await page.keyboard.press("Escape");
  await page.mouse.up();
  await expect(page.getByTestId("item-card").first()).toContainText("Item 1");
});
