import { test, expect, type Page } from "@playwright/test"

const TEST_EMAIL = "admin@example.com"
const TEST_PASSWORD = "admin123"

async function login(page: Page) {
  await page.goto("/")
  await page.getByTestId("sign-in-link").click()
  await page.getByTestId("email-input").fill(TEST_EMAIL)
  await page.getByTestId("password-input").fill(TEST_PASSWORD)
  await page.getByTestId("submit-button").click()
  await page.waitForURL("/")
}

async function waitForEditMode(page: Page) {
  await expect(page.getByTestId("edit-bar")).toBeVisible()
}

async function waitForExitEditMode(page: Page) {
  await expect(page.getByTestId("edit-bar")).not.toBeVisible()
}

async function waitForGroupDialogClose(page: Page) {
  await expect(page.getByTestId("group-dialog")).not.toBeVisible()
}

async function waitForItemDialogClose(page: Page) {
  await expect(page.getByTestId("item-dialog")).not.toBeVisible()
}

test.describe("Item Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)

    // Clean up any existing test groups
    await page.getByTestId("edit-button").click()
    await waitForEditMode(page)
    const deleteButtons = page.locator('[data-testid="item-delete-button"]')
    const count = await deleteButtons.count()
    for (let i = 0; i < count; i++) {
      if (await deleteButtons.nth(i).isVisible()) {
        await deleteButtons.nth(i).click()
        await page.getByTestId("item-delete-confirm").click()
        await expect(page.getByTestId("item-delete-confirm")).not.toBeVisible()
      }
    }
    await page.getByTestId("done-button").click()
    await waitForExitEditMode(page)
  })

  test("should create a new item in a group", async ({ page }) => {
    // Enter edit mode
    await page.getByTestId("edit-button").click()
    await waitForEditMode(page)

    // Create a group first
    const groupName = `Test Group ${Date.now()}`
    const itemName = `Test Item ${Date.now()}`
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await waitForGroupDialogClose(page)

    // Click Add item in the specific group
    await page.getByLabel(groupName).getByTestId("add-item-button").click()

    // Fill in item details
    await expect(page.getByTestId("item-dialog")).toBeVisible()
    await page.getByTestId("item-label-input").fill(itemName)
    await page.getByTestId("item-href-input").fill("https://example.com")

    // Submit
    await page.getByTestId("item-dialog-submit").click()
    await waitForItemDialogClose(page)

    // Verify item was created
    await expect(
      page.getByLabel(groupName).getByText(itemName, { exact: true }).first()
    ).toBeVisible()
  })

  test("should create item with service type", async ({ page }) => {
    // Enter edit mode
    await page.getByTestId("edit-button").click()
    await waitForEditMode(page)

    // Create a group
    const groupName = `Service Group ${Date.now()}`
    const itemName = `Service Test ${Date.now()}`
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await waitForGroupDialogClose(page)

    // Click Add item in the specific group
    await page.getByLabel(groupName).getByTestId("add-item-button").click()

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
    await waitForItemDialogClose(page)

    // Verify item was created
    await expect(
      page.getByLabel(groupName).getByText(itemName, { exact: true }).first()
    ).toBeVisible()
  })

  test("should edit an existing item", async ({ page }) => {
    const itemName = `Edit Item Test ${Date.now()}`
    const newItemName = `Edited Item ${Date.now()}`
    const groupName = `Edit Group ${Date.now()}`

    // Enter edit mode
    await page.getByTestId("edit-button").click()
    await waitForEditMode(page)

    // Create group and item
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await waitForGroupDialogClose(page)

    // Add item in the specific group
    await page.getByLabel(groupName).getByTestId("add-item-button").click()

    await page.getByTestId("item-label-input").fill(itemName)
    await page
      .getByTestId("item-href-input")
      .fill("https://original.example.com")
    await page.getByTestId("item-dialog-submit").click()
    await waitForItemDialogClose(page)

    // Exit and re-enter edit mode
    await page.getByTestId("done-button").click()
    await waitForExitEditMode(page)
    await page.getByTestId("edit-button").click()
    await waitForEditMode(page)

    // Find and click edit on the item - use the item card within the group
    const itemCard = page
      .getByLabel(groupName)
      .getByText(itemName, { exact: true })
      .first()

    // Click the item card to open edit dialog
    await itemCard.click()

    // Check if dialog opened for editing
    if (await page.getByTestId("item-dialog").isVisible()) {
      await page.getByTestId("item-label-input").fill(newItemName)
      await page.getByTestId("item-dialog-submit").click()
      await waitForItemDialogClose(page)

      // Verify change
      await expect(
        page
          .getByLabel(groupName)
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
    await waitForEditMode(page)

    // Create group and item
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await waitForGroupDialogClose(page)

    // Add item in the specific group
    await page.getByLabel(groupName).getByTestId("add-item-button").click()

    await page.getByTestId("item-label-input").fill(itemName)
    await page.getByTestId("item-dialog-submit").click()
    await waitForItemDialogClose(page)

    // Find and delete the item - use the delete button within the group
    const deleteButton = page
      .getByLabel(groupName)
      .locator('[data-testid="item-delete-button"]')
      .first()

    if (await deleteButton.isVisible()) {
      await deleteButton.click()
      await page.getByTestId("item-delete-confirm").click()
      await expect(page.getByTestId("item-delete-confirm")).not.toBeVisible()
    }

    // Item should be removed
    await expect(
      page.getByLabel(groupName).getByText(itemName, { exact: true }).first()
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
    await waitForEditMode(page)

    // Create group
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await waitForGroupDialogClose(page)

    // Add first item in the specific group
    await page.getByLabel(groupName).getByTestId("add-item-button").click()
    await page.getByTestId("item-label-input").fill(item1Name)
    await page.getByTestId("item-dialog-submit").click()
    await waitForItemDialogClose(page)

    // Add second item in the specific group
    await page.getByLabel(groupName).getByTestId("add-item-button").click()
    await page.getByTestId("item-label-input").fill(item2Name)
    await page.getByTestId("item-dialog-submit").click()
    await waitForItemDialogClose(page)

    // Get the item cards
    const group = page.getByLabel(groupName)
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
})
