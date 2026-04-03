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

test.describe("Group Management", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)
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

    // Exit edit mode to see the group name
    await page.getByTestId("done-button").click()

    // Verify group was created by checking it exists on page
    await expect(page.getByTestId("group-name")).toContainText(/Test Group/)
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

    // Find and click edit on the group
    const groupElement = page
      .getByTestId("group")
      .filter({ hasText: groupName })

    await groupElement.getByTestId("group-edit-button").click()

    // Edit dialog should appear
    await expect(page.getByTestId("group-dialog")).toBeVisible()

    // Change name
    await page.getByTestId("group-name-input").fill(newGroupName)
    await page.getByTestId("group-dialog-submit").click()

    // Exit edit mode to see the updated name
    await page.getByTestId("done-button").click()

    // Verify change - find the specific group by its label
    const editedGroup = page.getByLabel(newGroupName)
    await expect(editedGroup.getByTestId("group-name")).toContainText(
      newGroupName
    )
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
    const groupElement = page
      .getByTestId("group")
      .filter({ hasText: groupName })

    await groupElement.getByTestId("group-delete-button").click()
    await page.getByTestId("group-delete-confirm").click()

    // Group should be removed
    await page.waitForTimeout(500)
    await expect(page.getByLabel(groupName)).not.toBeVisible()
  })
})
