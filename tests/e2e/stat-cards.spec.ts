import { test, expect, seedAndAuth } from "../fixtures";
import { dragAndDropInDialog } from "../helpers/dnd";

const RADARR_URL = "https://radarr.test";

test.describe("Stat Card Reordering and Visibility", () => {
  test.beforeEach(async ({ page }) => {
    await seedAndAuth(page, {
      groups: [
        {
          name: "Media",
          items: [
            {
              label: "Radarr",
              href: RADARR_URL,
              serviceType: "radarr",
              serviceUrl: RADARR_URL,
              cachedWidgetData: {
                queued: 5,
                missing: 3,
                wanted: 7,
                movies: 42,
              },
            },
          ],
        },
      ],
    });
  });

  test("reorders stat cards via drag-and-drop in edit mode", async ({ page }) => {
    await page.goto("/");

    // Wait for stat cards to load
    await expect(page.getByText("Movies")).toBeVisible({ timeout: 15_000 });

    // Enter edit mode
    await page.getByRole("button", { name: "Edit" }).click();

    // Small delay to ensure edit mode is fully initialized
    await page.waitForTimeout(500);

    // Open the item dialog by clicking the edit button on the item
    await page.getByLabel("Edit item").first().click();

    // Wait for dialog to open and stat cards to render
    await expect(page.getByRole("heading", { name: "Edit Item" })).toBeVisible();
    await expect(page.getByText("Stat Card Layout")).toBeVisible();

    // Scope to the dialog to avoid picking up dashboard stat cards
    const dialog = page.getByRole("dialog", { name: "Edit Item" });

    // Get the initial order of stat cards
    const statCards = dialog.locator('[data-testid="stat-card"]');
    const initialCount = await statCards.count();
    expect(initialCount).toBeGreaterThanOrEqual(2);

    // Get the second stat card's label for verification after drag
    const secondLabel = await statCards.nth(1).textContent();

    // Drag the second stat card to the first position
    // Use the stat cards themselves as drag handles (they have aria-label and are the actual draggable elements)
    const firstStatCard = statCards.nth(0);
    const secondStatCard = statCards.nth(1);

    await dragAndDropInDialog(page, secondStatCard, firstStatCard);

    // Wait for the drag animation and state update to complete
    await page.waitForTimeout(500);

    // Re-query stat cards after drag to get updated DOM
    const updatedStatCards = dialog.locator('[data-testid="stat-card"]');

    // Verify order changed - the first card should now be what was previously second
    // Use expect with retry-ability
    await expect(updatedStatCards.nth(0)).toContainText(secondLabel ?? "");
  });

  test("disables stat card by dragging to unused zone", async ({ page }) => {
    await page.goto("/");

    // Wait for stat cards to load
    await expect(page.getByText("Movies")).toBeVisible({ timeout: 15_000 });

    // Enter edit mode
    await page.getByRole("button", { name: "Edit" }).click();

    // Open the item dialog
    await page.getByLabel("Edit item").first().click();

    // Wait for dialog to open
    await expect(page.getByRole("heading", { name: "Edit Item" })).toBeVisible();
    await expect(page.getByText("Stat Card Layout")).toBeVisible();

    // Scope to the dialog
    const dialog = page.getByRole("dialog", { name: "Edit Item" });

    // Count visible stat cards before drag
    const initialStatCount = await dialog.locator('[data-testid="stat-card"]').count();
    expect(initialStatCount).toBeGreaterThanOrEqual(2);

    // Get a stat card to drag (e.g., the first one)
    const statCard = dialog.locator('[data-testid="stat-card"]').first();
    const statLabel = await statCard.textContent();

    // Drag to unused zone
    const firstHandle = dialog.locator('[aria-label="Drag to reorder stat card"]').nth(0);
    const unusedZone = dialog.locator('[aria-label="Unused stat cards"]');

    await dragAndDropInDialog(page, firstHandle, unusedZone);

    // Verify the stat card moved to unused area
    const unusedItems = dialog.locator('[data-testid="unused-stat-card"]');
    await expect(unusedItems).toHaveCount(1);

    // Verify the unused zone shows the moved card
    await expect(unusedItems.first()).toContainText(statLabel ?? "");
  });

  test("enables stat card by dragging from unused zone", async ({ page }) => {
    await page.goto("/");

    // Wait for stat cards to load
    await expect(page.getByText("Movies")).toBeVisible({ timeout: 15_000 });

    // Enter edit mode
    await page.getByRole("button", { name: "Edit" }).click();

    // Open the item dialog
    await page.getByLabel("Edit item").first().click();

    // Wait for dialog to open
    await expect(page.getByRole("heading", { name: "Edit Item" })).toBeVisible();
    await expect(page.getByText("Stat Card Layout")).toBeVisible();

    // Scope to the dialog
    const dialog = page.getByRole("dialog", { name: "Edit Item" });

    // First, drag a stat card to unused zone
    const firstHandle = dialog.locator('[aria-label="Drag to reorder stat card"]').nth(0);
    const unusedZone = dialog.locator('[aria-label="Unused stat cards"]');
    await dragAndDropInDialog(page, firstHandle, unusedZone);

    // Wait for drag animation and state update
    await page.waitForTimeout(500);

    // Verify it's in unused
    const unusedItems = dialog.locator('[data-testid="unused-stat-card"]');
    await expect(unusedItems).toHaveCount(1);
    const unusedLabel = await unusedItems.first().textContent();

    // Now drag it back to active zone - re-query to ensure we get the freshly rendered element
    const unusedHandle = unusedItems.first();
    await expect(unusedHandle).toBeVisible();

    const activeStatCard = dialog.locator('[data-testid="stat-card"]').first();
    await expect(activeStatCard).toBeVisible();

    await dragAndDropInDialog(page, unusedHandle, activeStatCard);

    // Wait for the drag animation and state update to complete
    await page.waitForTimeout(500);

    // Verify it's back in active zone
    await expect(unusedItems).toHaveCount(0);
    const activeStatCards = dialog.locator('[data-testid="stat-card"]');
    await expect(activeStatCards.first()).toContainText(unusedLabel ?? "");
  });

  test("persists stat card order after saving", async ({ page }) => {
    await page.goto("/");

    // Wait for stat cards to load
    await expect(page.getByText("Movies")).toBeVisible({ timeout: 15_000 });

    // Enter edit mode
    await page.getByRole("button", { name: "Edit" }).click();

    // Open the item dialog
    await page.getByLabel("Edit item").first().click();

    // Wait for dialog to open
    await expect(page.getByRole("heading", { name: "Edit Item" })).toBeVisible();
    await expect(page.getByText("Stat Card Layout")).toBeVisible();

    // Scope to the dialog
    const dialog = page.getByRole("dialog", { name: "Edit Item" });

    // Get initial order
    const statCards = dialog.locator('[data-testid="stat-card"]');
    const initialSecondLabel = await statCards.nth(1).textContent();

    // Reorder: drag second to first
    const handles = dialog.locator('[aria-label="Drag to reorder stat card"]');
    await dragAndDropInDialog(page, handles.nth(1), handles.nth(0));

    // Save the item
    await page.getByRole("button", { name: "Update" }).click();

    // Wait for dialog to close
    await expect(page.getByText("Stat Card Layout")).not.toBeVisible();

    // Exit edit mode
    await page.getByRole("button", { name: "Done" }).click();

    // Reload page to verify persistence
    await page.reload();

    // Wait for stat cards to load
    await expect(page.getByText("Movies")).toBeVisible({ timeout: 15_000 });

    // Re-enter edit mode
    await page.getByRole("button", { name: "Edit" }).click();

    // Open the item dialog again
    await page.getByLabel("Edit item").first().click();

    // Wait for dialog to open
    await expect(page.getByRole("heading", { name: "Edit Item" })).toBeVisible();
    await expect(page.getByText("Stat Card Layout")).toBeVisible();

    // Verify order persisted
    const reorderedStatCards = dialog.locator('[data-testid="stat-card"]');
    const persistedFirstLabel = await reorderedStatCards.nth(0).textContent();
    expect(persistedFirstLabel).toBe(initialSecondLabel);
  });

  test("shows unused zone with count", async ({ page }) => {
    await page.goto("/");

    // Wait for stat cards to load
    await expect(page.getByText("Movies")).toBeVisible({ timeout: 15_000 });

    // Enter edit mode
    await page.getByRole("button", { name: "Edit" }).click();

    // Open the item dialog
    await page.getByLabel("Edit item").first().click();

    // Wait for dialog to open
    await expect(page.getByRole("heading", { name: "Edit Item" })).toBeVisible();
    await expect(page.getByText("Stat Card Layout")).toBeVisible();

    // Scope to the dialog
    const dialog = page.getByRole("dialog", { name: "Edit Item" });

    // Unused zone should show count of 0 initially
    await expect(dialog.getByText("Unused (0)")).toBeVisible();

    // Drag a stat card to unused zone
    const firstHandle = dialog.locator('[aria-label="Drag to reorder stat card"]').nth(0);
    const unusedZone = dialog.locator('[aria-label="Unused stat cards"]');
    await dragAndDropInDialog(page, firstHandle, unusedZone);

    // Unused zone should now show count of 1
    await expect(dialog.getByText("Unused (1)")).toBeVisible();
  });
});
