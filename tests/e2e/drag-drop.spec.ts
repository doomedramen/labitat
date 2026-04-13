import { test, expect, seedAndAuth } from "../fixtures";
import { dragAndDrop, dragAndDropManual } from "../helpers/dnd";

test.describe("Drag and Drop Reordering", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndAuth(page, {
      groups: [
        {
          name: "Group A",
          items: [
            { label: "Item 1", href: "https://a1.test" },
            { label: "Item 2", href: "https://a2.test" },
            { label: "Item 3", href: "https://a3.test" },
          ],
        },
        {
          name: "Group B",
          items: [
            { label: "Item 4", href: "https://b1.test" },
            { label: "Item 5", href: "https://b2.test" },
          ],
        },
      ],
    });
    await page.goto("/");
    await page.getByRole("button", { name: "Edit" }).click();
  });

  test("reorders items within a group", async ({ page }) => {
    const itemCards = page.getByTestId("item-card");
    await expect(itemCards).toHaveCount(5);

    await expect(itemCards.nth(0)).toContainText("Item 1");
    await expect(itemCards.nth(2)).toContainText("Item 3");

    // The drag handle is a sibling of the item-card div, so locate from the parent
    const handles = page.locator('[aria-label="Drag to reorder"]');
    const firstHandle = handles.nth(0);
    const thirdHandle = handles.nth(2);

    const responsePromise = page.waitForResponse(
      (resp) => resp.request().method() === "POST" && resp.status() === 200,
    );
    await dragAndDrop(page, thirdHandle, firstHandle);
    await responsePromise;
  });

  test("reorders groups", async ({ page }) => {
    const groups = page.locator("h2");
    await expect(groups.nth(0)).toContainText("Group A");
    await expect(groups.nth(1)).toContainText("Group B");

    // Target the group drag handles — @dnd-kit only activates from the handle
    const groupAHandle = page
      .locator("h2", { hasText: "Group A" })
      .locator("..")
      .locator('[aria-label="Drag to reorder group"]');
    const groupBHandle = page
      .locator("h2", { hasText: "Group B" })
      .locator("..")
      .locator('[aria-label="Drag to reorder group"]');

    // Listen for the Next.js server action POST (has next-action header)
    const responsePromise = page.waitForResponse(
      (resp) => resp.request().method() === "POST" && "next-action" in resp.request().headers(),
    );
    await dragAndDropManual(page, groupBHandle, groupAHandle);
    await responsePromise;

    // Verify the order changed
    await expect(groups.nth(0)).toContainText("Group B");
    await expect(groups.nth(1)).toContainText("Group A");
  });

  test("cancelling drag reverts position", async ({ page }) => {
    const itemCards = page.getByTestId("item-card");
    const firstItem = itemCards.nth(0);
    const box = await firstItem.boundingBox();
    if (!box) return;

    // Start a drag
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await page.mouse.down();
    // Move slightly to activate
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 12);
    // Press Escape to cancel
    await page.keyboard.press("Escape");
    await page.mouse.up();

    // Items should be in original order
    await expect(itemCards.nth(0)).toContainText("Item 1");
  });
});
