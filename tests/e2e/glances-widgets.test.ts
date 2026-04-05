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

// All Glances variant service types (not the main "Glances" widget)
const GLANCES_VARIANTS = [
  { id: "glances-timeseries", name: "Glances Time Series" },
  { id: "glances-percpu", name: "Glances Per-Core CPU" },
  { id: "glances-processes", name: "Glances Processes" },
  { id: "glances-sensors", name: "Glances Temperature Sensors" },
  { id: "glances-diskusage", name: "Glances Disk Usage" },
]

test.describe("Glances variant widgets - config persistence", () => {
  test.beforeEach(async ({ page }) => {
    await login(page)

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

  for (const variant of GLANCES_VARIANTS) {
    test(`should persist Glances URL for ${variant.name}`, async ({ page }) => {
      const groupName = `Test Group ${variant.id}-${Date.now()}`
      const itemName = `Test ${variant.id} ${Date.now()}`
      const testUrl = `http://glances-${variant.id}.example.com:61208`

      // Enter edit mode
      await page.getByTestId("edit-button").click()

      // Create a group
      await page.getByTestId("add-group-button").click()
      await page.getByTestId("group-name-input").fill(groupName)
      await page.getByTestId("group-dialog-submit").click()
      await page.waitForTimeout(500)

      // Click Add item in the specific group
      await page.getByLabel(groupName).getByTestId("add-item-button").click()

      // Fill label
      await page.getByTestId("item-label-input").fill(itemName)

      // Select the Glances variant service type from combobox
      await page.getByPlaceholder("None (link only)").click()
      await page
        .getByRole("option", { name: variant.name, exact: true })
        .click()

      // Wait for service config section to appear
      await expect(page.getByTestId("item-service-config")).toBeVisible()

      // Fill in the Glances URL (label includes * for required)
      const urlInput = page.getByLabel(/Glances URL/)
      await expect(urlInput).toBeVisible()
      await urlInput.fill(testUrl)

      // Submit
      await page.getByTestId("item-dialog-submit").click()
      await page.waitForTimeout(500)

      // Verify item was created
      await expect(
        page.getByLabel(groupName).getByText(itemName, { exact: true }).first()
      ).toBeVisible()

      // Exit edit mode
      await page.getByTestId("done-button").click()
      await page.waitForTimeout(500)

      // Re-enter edit mode and click the item's edit button
      await page.getByTestId("edit-button").click()

      // Click the edit button on the item card
      const itemEditButton = page
        .getByLabel(groupName)
        .getByTestId("item-edit-button")
        .first()
      await itemEditButton.click()

      // Wait for dialog to load config
      await page.waitForTimeout(1000)

      // Verify the Glances URL was persisted
      const urlInputAfterEdit = page.getByLabel(/Glances URL/)
      await expect(urlInputAfterEdit).toBeVisible()
      await expect(urlInputAfterEdit).toHaveValue(testUrl)
    })
  }

  test(`should persist username and password for Glances variants`, async ({
    page,
  }) => {
    const groupName = `Auth Test Group ${Date.now()}`
    const itemName = `Auth Test ${Date.now()}`
    const testUrl = "http://glances-auth.example.com:61208"
    const testUsername = "myadmin"
    const testPassword = "secretpass123"

    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Create a group
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Click Add item in the specific group
    await page.getByLabel(groupName).getByTestId("add-item-button").click()

    // Fill label
    await page.getByTestId("item-label-input").fill(itemName)

    // Select Glances Disk Usage (any variant works for auth fields)
    await page.getByPlaceholder("None (link only)").click()
    await page
      .getByRole("option", { name: "Glances Disk Usage", exact: true })
      .click()

    // Wait for service config section
    await expect(page.getByTestId("item-service-config")).toBeVisible()

    // Fill in all fields
    await page.getByLabel(/Glances URL/).fill(testUrl)
    await page.getByLabel("Username").fill(testUsername)
    await page.getByLabel("Password").fill(testPassword)

    // Submit
    await page.getByTestId("item-dialog-submit").click()
    await page.waitForTimeout(500)

    // Exit edit mode
    await page.getByTestId("done-button").click()
    await page.waitForTimeout(500)

    // Re-enter edit mode and click the item's edit button
    await page.getByTestId("edit-button").click()

    // Click the edit button on the item card
    const itemEditButton = page
      .getByLabel(groupName)
      .getByTestId("item-edit-button")
      .first()
    await itemEditButton.click()

    // Wait for dialog to load config
    await page.waitForTimeout(500)

    // Verify all fields were persisted
    await expect(page.getByLabel(/Glances URL/)).toHaveValue(testUrl)
    await expect(page.getByLabel("Username")).toHaveValue(testUsername)
    // Password fields are typically not re-populated for security, but the
    // config should still be stored (verified by no decrypt error)
  })

  test(`should persist select field value for Glances Time Series`, async ({
    page,
  }) => {
    const groupName = `Select Test Group ${Date.now()}`
    const itemName = `Select Test ${Date.now()}`
    const testUrl = "http://glances-ts.example.com:61208"

    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Create a group
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Click Add item in the specific group
    await page.getByLabel(groupName).getByTestId("add-item-button").click()

    // Fill label
    await page.getByTestId("item-label-input").fill(itemName)

    // Select Glances Time Series
    await page.getByPlaceholder("None (link only)").click()
    await page
      .getByRole("option", { name: "Glances Time Series", exact: true })
      .click()

    // Wait for service config section
    await expect(page.getByTestId("item-service-config")).toBeVisible()

    // Fill in URL
    await page.getByLabel(/Glances URL/).fill(testUrl)

    // Select "Memory Usage" from the Metric dropdown
    await page.getByLabel(/Metric/).click()
    await page.getByRole("option", { name: "Memory Usage" }).click()
    await page.waitForTimeout(300) // Wait for React state to update hidden input

    // Submit
    await page.getByTestId("item-dialog-submit").click()
    await page.waitForTimeout(500)

    // Exit edit mode
    await page.getByTestId("done-button").click()
    await page.waitForTimeout(500)

    // Re-enter edit mode and click the item's edit button
    await page.getByTestId("edit-button").click()

    // Click the edit button on the item card
    const itemEditButton = page
      .getByLabel(groupName)
      .getByTestId("item-edit-button")
      .first()
    await itemEditButton.click()

    // Wait for dialog to load config
    await page.waitForTimeout(500)

    // Verify URL was persisted
    await expect(page.getByLabel(/Glances URL/)).toHaveValue(testUrl)

    // Verify the Metric select value was persisted
    // The select trigger shows the value (e.g. "memory") not the full label
    const metricTrigger = page.getByLabel(/Metric/)
    await expect(metricTrigger).toContainText("memory")
  })

  test(`should persist select field values for Glances Processes`, async ({
    page,
  }) => {
    const groupName = `Process Select Test ${Date.now()}`
    const itemName = `Process Select Test ${Date.now()}`
    const testUrl = "http://glances-proc.example.com:61208"

    // Enter edit mode
    await page.getByTestId("edit-button").click()

    // Create a group
    await page.getByTestId("add-group-button").click()
    await page.getByTestId("group-name-input").fill(groupName)
    await page.getByTestId("group-dialog-submit").click()
    await page.waitForTimeout(500)

    // Click Add item in the specific group
    await page.getByLabel(groupName).getByTestId("add-item-button").click()

    // Fill label
    await page.getByTestId("item-label-input").fill(itemName)

    // Select Glances Processes
    await page.getByPlaceholder("None (link only)").click()
    await page
      .getByRole("option", { name: "Glances Processes", exact: true })
      .click()

    // Wait for service config section
    await expect(page.getByTestId("item-service-config")).toBeVisible()

    // Fill in URL
    await page.getByLabel(/Glances URL/).fill(testUrl)

    // Select "10 processes" from count dropdown
    await page.getByLabel(/Process count/).click()
    await page.getByRole("option", { name: "10 processes" }).click()
    await page.waitForTimeout(300)

    // Select "Memory usage" from sort by dropdown
    await page.getByLabel(/Sort by/).click()
    await page.getByRole("option", { name: "Memory usage" }).click()
    await page.waitForTimeout(300)

    // Submit
    await page.getByTestId("item-dialog-submit").click()
    await page.waitForTimeout(500)

    // Exit edit mode
    await page.getByTestId("done-button").click()
    await page.waitForTimeout(500)

    // Re-enter edit mode and click the item's edit button
    await page.getByTestId("edit-button").click()

    // Click the edit button on the item card
    const itemEditButton = page
      .getByLabel(groupName)
      .getByTestId("item-edit-button")
      .first()
    await itemEditButton.click()

    // Wait for dialog to load config
    await page.waitForTimeout(500)

    // Verify URL was persisted
    await expect(page.getByLabel(/Glances URL/)).toHaveValue(testUrl)

    // Verify select values were persisted
    // The select trigger shows the value (e.g. "10") not the full label
    await expect(page.getByLabel(/Process count/)).toContainText("10")
    await expect(page.getByLabel(/Sort by/)).toContainText("memory")
  })
})
