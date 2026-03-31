import { test, expect } from "@playwright/test"

test.describe("Group Management", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login")
    await page.getByTestId("email-input").fill("admin@example.com")
    await page.getByTestId("password-input").fill("admin123")
    await page.getByTestId("submit-button").click()
    await page.waitForURL("/")
  })

  test("should create a new group", async ({ page }) => {
    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Click Add group button
    await page.getByTestId("add-group-button").click()

    // Fill in group name
    await expect(page.getByTestId("group-dialog")).toBeVisible()
    await page.getByTestId("group-name-input").fill(`Test Group ${Date.now()}`)

    // Submit
    await page.getByTestId("group-dialog-submit").click()

    // Dialog should close and group should appear
    await page.waitForTimeout(500)
    await expect(page.getByTestId("group-dialog")).not.toBeVisible()

    // Verify group was created by checking it exists on page
    await expect(page.locator("[data-radix-collection-item]")).toContainText(
      /Test Group/
    )
  })

  test("should show error when creating group with empty name", async ({
    page,
  }) => {
    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Click Add group button
    await page.getByTestId("add-group-button").click()

    // Try to submit without name
    await page.getByTestId("group-dialog-submit").click()

    // Should show error or validation
    await page.waitForTimeout(500)
    // Dialog should still be open
    await expect(page.getByTestId("group-dialog")).toBeVisible()
  })

  test("should cancel group creation", async ({ page }) => {
    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Click Add group button
    await page.getByTestId("add-group-button").click()

    // Fill in group name
    await page.getByTestId("group-name-input").fill("Cancel Test Group")

    // Close dialog by clicking outside or escape
    await page.keyboard.press("Escape")

    // Dialog should close
    await expect(page.getByTestId("group-dialog")).not.toBeVisible()
  })

  test("should edit an existing group", async ({ page }) => {
    const groupName = `Edit Test Group ${Date.now()}`
    const newGroupName = `Edited Group ${Date.now()}`

    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Create a group first
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Exit edit mode
    await page.getByTestId("done-button").click()

    // Re-enter edit mode
    await page.getByTestId("edit-button").click()

    // Find and click edit on the group (look for group with the name)
    const groupElement = page.locator(
      `[data-radix-collection-item]:has-text("${groupName}")`
    )

    // Look for edit button within group - typically a pencil icon or edit button
    const editButton = groupElement.locator(
      'button[aria-label*="edit"], button:has-text("Edit")'
    )

    if (await editButton.isVisible()) {
      await editButton.click()
    } else {
      // If no edit button, try double-clicking the group header
      await groupElement.dblclick()
    }

    // Edit dialog should appear
    await expect(page.getByTestId("group-dialog")).toBeVisible()

    // Change name
    await page.getByTestId("group-name-input").fill(newGroupName)
    await page.getByTestId("group-dialog-submit").click()

    // Verify change
    await page.waitForTimeout(500)
    await expect(page.locator(`text=${newGroupName}`)).toBeVisible()
  })

  test("should delete a group", async ({ page }) => {
    const groupName = `Delete Test Group ${Date.now()}`

    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Create a group first
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Look for delete button on the group
    const groupElement = page.locator(
      `[data-radix-collection-item]:has-text("${groupName}")`
    )
    const deleteButton = groupElement.locator(
      'button[aria-label*="delete"], button:has-text("Delete")'
    )

    if (await deleteButton.isVisible()) {
      await deleteButton.click()
    } else {
      // Try right-clicking for context menu
      await groupElement.click({ button: "right" })
      await page.getByText(/delete/i).click()
    }

    // Group should be removed
    await page.waitForTimeout(500)
    await expect(page.locator(`text=${groupName}`)).not.toBeVisible()
  })

  test("should reorder groups via drag and drop", async ({ page }) => {
    const group1Name = `First Group ${Date.now()}`
    const group2Name = `Second Group ${Date.now()}`

    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Create first group
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(group1Name)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Create second group
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(group2Name)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Get group elements
    const group1 = page.locator(
      `[data-radix-collection-item]:has-text("${group1Name}")`
    )
    const group2 = page.locator(
      `[data-radix-collection-item]:has-text("${group2Name}")`
    )

    // Get initial positions
    const group1Box = await group1.boundingBox()
    const group2Box = await group2.boundingBox()

    if (group1Box && group2Box) {
      // Drag group1 below group2 (or vice versa)
      await group1.dragTo(group2)
      await page.waitForTimeout(500)

      // Verify order changed (check new positions)
      const newGroup1Box = await group1.boundingBox()
      const newGroup2Box = await group2.boundingBox()

      if (newGroup1Box && newGroup2Box) {
        // One of them should have moved
        expect(
          newGroup1Box.y !== group1Box.y || newGroup2Box.y !== group2Box.y
        ).toBe(true)
      }
    }
  })
})
