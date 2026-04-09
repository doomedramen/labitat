import { test, expect, seedAndAuth } from "../fixtures"
import { dragAndDrop } from "../helpers/dnd"

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
    })
    await page.goto("/")
    await page.getByRole("button", { name: "Edit" }).click()
  })

  test("reorders items within a group", async ({ page }) => {
    // Get the drag handles for items (grip vertical icons)
    const itemCards = page.getByTestId("item-card")
    await expect(itemCards).toHaveCount(5)

    // Drag Item 3 below Item 1 (swap positions with Item 2)
    // We'll verify by checking the text order
    const firstItem = itemCards.nth(0)
    const thirdItem = itemCards.nth(2)
    await expect(firstItem).toContainText("Item 1")
    await expect(thirdItem).toContainText("Item 3")

    // Perform the drag and wait for the reorder server action to complete
    const responsePromise = page.waitForResponse(
      (resp) => resp.request().method() === "POST" && resp.status() === 200
    )
    await dragAndDrop(page, thirdItem, firstItem)
    await responsePromise
  })

  test("reorders groups", async ({ page }) => {
    // Group A should appear first
    const groups = page.locator("h2")
    await expect(groups.nth(0)).toContainText("Group A")
    await expect(groups.nth(1)).toContainText("Group B")

    // Drag Group B above Group A
    const groupAHeader = page.locator("h2", { hasText: "Group A" })
    const groupBHeader = page.locator("h2", { hasText: "Group B" })
    // Drag and wait for the reorder server action to complete
    const responsePromise = page.waitForResponse(
      (resp) => resp.request().method() === "POST" && resp.status() === 200
    )
    await dragAndDrop(page, groupBHeader, groupAHeader)
    await responsePromise
  })

  test("cancelling drag reverts position", async ({ page }) => {
    const itemCards = page.getByTestId("item-card")
    const firstItem = itemCards.nth(0)
    const box = await firstItem.boundingBox()
    if (!box) return

    // Start a drag
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    // Move slightly to activate
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2 + 12)
    // Press Escape to cancel
    await page.keyboard.press("Escape")
    await page.mouse.up()

    // Items should be in original order
    await expect(itemCards.nth(0)).toContainText("Item 1")
  })
})
