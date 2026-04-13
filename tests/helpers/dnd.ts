import type { Locator, Page } from "@playwright/test";

/**
 * Perform a drag-and-drop using raw pointer events.
 * Required because @dnd-kit uses PointerSensor, not the HTML5 drag API.
 */
export async function dragAndDrop(page: Page, source: Locator, target: Locator) {
  // Scroll elements into view so boundingBox returns correct viewport coordinates
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Element not visible");

  // Use Playwright's built-in dragTo which handles pointer events properly
  await source.dragTo(target, {
    sourcePosition: { x: sourceBox.width / 2, y: sourceBox.height / 2 },
    targetPosition: { x: targetBox.width / 2, y: targetBox.height / 2 },
  });
}

/**
 * Perform a drag-and-drop using manual pointer events.
 * This is more reliable for @dnd-kit when dragTo fails to trigger proper drop targets.
 */
export async function dragAndDropManual(page: Page, source: Locator, target: Locator) {
  // Scroll elements into view so boundingBox returns correct viewport coordinates
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();

  // Small delay to ensure scroll is complete
  await page.waitForTimeout(100);

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Element not visible");

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  // Move to source and press
  await page.mouse.move(sourceX, sourceY);
  await page.waitForTimeout(50);
  await page.mouse.down();
  // Move slightly to activate drag (must be > 8px for PointerSensor activationConstraint)
  await page.mouse.move(sourceX, sourceY + 12);
  await page.waitForTimeout(50);
  // Move to target with steps for smooth tracking
  await page.mouse.move(targetX, targetY, { steps: 15 });
  await page.waitForTimeout(50);
  // Release
  await page.mouse.up();
}

/**
 * Perform a drag-and-drop specifically for elements inside dialogs/modals.
 * Uses manual pointer events with extra delays for dialog rendering.
 */
export async function dragAndDropInDialog(page: Page, source: Locator, target: Locator) {
  // Scroll elements into view
  await source.scrollIntoViewIfNeeded();
  await target.scrollIntoViewIfNeeded();

  // Extra delay for dialog animations to complete
  await page.waitForTimeout(200);

  const sourceBox = await source.boundingBox();
  const targetBox = await target.boundingBox();
  if (!sourceBox || !targetBox) throw new Error("Element not visible");

  const sourceX = sourceBox.x + sourceBox.width / 2;
  const sourceY = sourceBox.y + sourceBox.height / 2;
  const targetX = targetBox.x + targetBox.width / 2;
  const targetY = targetBox.y + targetBox.height / 2;

  // Move to source and press
  await page.mouse.move(sourceX, sourceY);
  await page.waitForTimeout(100);
  await page.mouse.down();
  // Move slightly to activate drag (must be > 8px for PointerSensor activationConstraint)
  await page.mouse.move(sourceX, sourceY + 12);
  await page.waitForTimeout(100);
  // Move to target with steps for smooth tracking
  await page.mouse.move(targetX, targetY, { steps: 20 });
  await page.waitForTimeout(100);
  // Release
  await page.mouse.up();
}
