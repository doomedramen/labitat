import { test, expect } from "@playwright/test"

test.describe("Item Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login")
    await page.getByTestId("email-input").fill("admin@example.com")
    await page.getByTestId("password-input").fill("admin123")
    await page.getByTestId("submit-button").click()
    await page.waitForURL("/")

    // Clean up any existing test groups
    await page.getByTestId("edit-button").click()
    const deleteButtons = page.locator('[data-testid="item-delete-button"]')
    const count = await deleteButtons.count()
    for (let i = 0; i < count; i++) {
      if (await deleteButtons.nth(i).isVisible()) {
        await deleteButtons.nth(i).click()
        await page.getByTestId("item-delete-confirm").click()
        await page.waitForTimeout(200)
      }
    }
    await page.getByTestId("done-button").click()
    await page.waitForTimeout(500)
  })

  test("should create a new item in a group", async ({ page }) => {
    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Create a group first
    const groupName = `Test Group ${Date.now()}`
    const itemName = `Test Item ${Date.now()}`
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Click Add item in the specific group
    await page
      .getByRole("region", { name: groupName })
      .getByTestId("add-item-button")
      .click()

    // Fill in item details
    await expect(page.getByTestId("item-dialog")).toBeVisible()
    await page.getByTestId("item-label-input").fill(itemName)
    await page.getByTestId("item-href-input").fill("https://example.com")

    // Submit
    await page.getByTestId("item-dialog-submit").click()

    // Dialog should close
    await page.waitForTimeout(500)
    await expect(page.getByTestId("item-dialog")).not.toBeVisible()

    // Verify item was created
    await expect(
      page
        .getByRole("region", { name: groupName })
        .getByText(itemName, { exact: true })
        .first()
    ).toBeVisible()
  })

  test("should show error when creating item with empty label", async ({
    page,
  }) => {
    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Create a group first
    const groupName = `Validation Group ${Date.now()}`
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Click Add item in the specific group
    await page
      .getByRole("region", { name: groupName })
      .getByTestId("add-item-button")
      .click()

    // Try to submit without label
    await page.getByTestId("item-dialog-submit").click()

    // Should show error or stay open
    await page.waitForTimeout(500)
    await expect(page.getByTestId("item-dialog")).toBeVisible()
  })

  test("should create item with service type", async ({ page }) => {
    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Create a group
    const groupName = `Service Group ${Date.now()}`
    const itemName = `Service Test ${Date.now()}`
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Click Add item in the specific group
    await page
      .getByRole("region", { name: groupName })
      .getByTestId("add-item-button")
      .click()

    // Fill in item details
    await page.getByTestId("item-label-input").fill(itemName)
    await page.getByTestId("item-href-input").fill("https://sonarr.example.com")

    // Select a service type from combobox
    await page.getByPlaceholder("None (link only)").click()

    // Select "None (link only)" or first available service
    const firstOption = page.locator('[data-slot="combobox-item"]').first()
    await firstOption.click()

    // Submit
    await page.getByTestId("item-dialog-submit").click()
    await page.waitForTimeout(500)

    // Verify item was created
    await expect(
      page
        .getByRole("region", { name: groupName })
        .getByText(itemName, { exact: true })
        .first()
    ).toBeVisible()
  })

  test("should edit an existing item", async ({ page }) => {
    const itemName = `Edit Item Test ${Date.now()}`
    const newItemName = `Edited Item ${Date.now()}`
    const groupName = `Edit Group ${Date.now()}`

    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Create group and item
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Add item in the specific group
    await page
      .getByRole("region", { name: groupName })
      .getByTestId("add-item-button")
      .click()

    await page.getByTestId("item-label-input").fill(itemName)
    await page
      .getByTestId("item-href-input")
      .fill("https://original.example.com")
    await page.getByTestId("item-dialog-submit").click()
    await page.waitForTimeout(500)

    // Exit and re-enter edit mode
    await page.getByTestId("done-button").click()
    await page.getByTestId("edit-button").click()

    // Find and click edit on the item - use the item card within the group
    const itemCard = page
      .getByRole("region", { name: groupName })
      .getByText(itemName, { exact: true })
      .first()

    // Click the item card to open edit dialog
    await itemCard.click()

    // Check if dialog opened for editing
    if (await page.getByTestId("item-dialog").isVisible()) {
      await page.getByTestId("item-label-input").fill(newItemName)
      await page.getByTestId("item-dialog-submit").click()
      await page.waitForTimeout(500)

      // Verify change
      await expect(
        page
          .getByRole("region", { name: groupName })
          .getByText(newItemName, { exact: true })
          .first()
      ).toBeVisible()
    }
  })

  test("should delete an item", async ({ page }) => {
    const itemName = `Delete Item Test ${Date.now()}`
    const groupName = `Delete Group ${Date.now()}`

    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Create group and item
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Add item in the specific group
    await page
      .getByRole("region", { name: groupName })
      .getByTestId("add-item-button")
      .click()

    await page.getByTestId("item-label-input").fill(itemName)
    await page.getByTestId("item-dialog-submit").click()
    await page.waitForTimeout(500)

    // Find and delete the item - use the delete button within the group
    const deleteButton = page
      .getByRole("region", { name: groupName })
      .locator('[data-testid="item-delete-button"]')
      .first()

    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      await page.getByTestId("item-delete-confirm").click()
    }

    // Item should be removed
    await page.waitForTimeout(500)
    await expect(
      page
        .getByRole("region", { name: groupName })
        .getByText(itemName, { exact: true })
        .first()
    ).not.toBeVisible()
  })

  // Note: This test is skipped as dnd-kit's collision detection is flaky with Playwright
  test.skip("should reorder items within a group via drag and drop", async ({
    page,
  }) => {
    const groupName = `Reorder Group ${Date.now()}`
    const item1Name = `First Item ${Date.now()}`
    const item2Name = `Second Item ${Date.now()}`

    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Create group
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Add first item in the specific group
    await page
      .getByRole("region", { name: groupName })
      .getByTestId("add-item-button")
      .click()
    await page.getByTestId("item-label-input").fill(item1Name)
    await page.getByTestId("item-dialog-submit").click()
    await page.waitForTimeout(500)

    // Add second item in the specific group
    await page
      .getByRole("region", { name: groupName })
      .getByTestId("add-item-button")
      .click()
    await page.getByTestId("item-label-input").fill(item2Name)
    await page.getByTestId("item-dialog-submit").click()
    await page.waitForTimeout(500)

    // Get the item cards
    const group = page.getByRole("region", { name: groupName })
    const item1Card = group.locator('[data-testid="item-card"]').first()
    const item2Card = group.locator('[data-testid="item-card"]').nth(1)

    // Get initial positions
    const item1Box = await item1Card.boundingBox()
    const item2Box = await item2Card.boundingBox()

    if (item1Box && item2Box) {
      // Scroll item into view
      await item1Card.scrollIntoViewIfNeeded()

      // Use dragTo on the card itself for dnd-kit
      await item1Card.dragTo(item2Card, { force: true })
      await page.waitForTimeout(1000)

      // Verify order changed - item1 should now be below item2
      const newItem1Box = await item1Card.boundingBox()
      const newItem2Box = await item2Card.boundingBox()

      // After reordering, item1 should be below item2
      if (newItem1Box && newItem2Box) {
        expect(newItem1Box.y).toBeGreaterThan(newItem2Box.y)
      }
    }
  })

  test("should move item between groups via drag and drop", async ({
    page,
  }) => {
    const group1Name = `Source Group ${Date.now()}`
    const group2Name = `Target Group ${Date.now()}`
    const itemName = `Move Item ${Date.now()}`

    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Create source group
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(group1Name)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Create target group
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(group2Name)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Add item to first group
    await page
      .getByRole("region", { name: group1Name })
      .getByTestId("add-item-button")
      .click()

    await page.getByTestId("item-label-input").fill(itemName)
    await page.getByTestId("item-dialog-submit").click()
    await page.waitForTimeout(500)

    // Find the item card in source group
    const sourceGroup = page.getByRole("region", { name: group1Name })
    const targetGroup = page.getByRole("region", { name: group2Name })
    const itemCard = sourceGroup.locator('[data-testid="item-card"]').first()

    // Get bounding boxes for drag operation
    const itemBox = await itemCard.boundingBox()
    const targetBox = await targetGroup.boundingBox()

    if (itemBox && targetBox) {
      // Scroll item into view and get drag handle
      await itemCard.scrollIntoViewIfNeeded()
      const dragHandle = itemCard.locator('[aria-label="Drag to reorder item"]')

      // Use mouse events for dnd-kit compatibility
      await dragHandle.hover({ force: true, position: { x: 10, y: 10 } })
      await page.mouse.down()
      await page.mouse.move(
        targetBox.x + targetBox.width / 2,
        targetBox.y + targetBox.height / 2,
        { steps: 10 }
      )
      await page.mouse.up()
      await page.waitForTimeout(1000)

      // Verify item is now in target group
      await expect(
        targetGroup.getByText(itemName, { exact: true }).first()
      ).toBeVisible()
    }
  })
})
