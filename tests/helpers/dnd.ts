import type { Locator, Page } from "@playwright/test"

/**
 * Perform a drag-and-drop using raw pointer events.
 * Required because @dnd-kit uses PointerSensor, not the HTML5 drag API.
 */
export async function dragAndDrop(
  page: Page,
  source: Locator,
  target: Locator
) {
  const sourceBox = await source.boundingBox()
  const targetBox = await target.boundingBox()
  if (!sourceBox || !targetBox) throw new Error("Element not visible")

  const sx = sourceBox.x + sourceBox.width / 2
  const sy = sourceBox.y + sourceBox.height / 2
  const tx = targetBox.x + targetBox.width / 2
  const ty = targetBox.y + targetBox.height / 2

  await page.mouse.move(sx, sy)
  await page.mouse.down()
  // Move past activation constraint (~8px for @dnd-kit)
  await page.mouse.move(sx, sy + 12)
  // Animate toward target
  await page.mouse.move(tx, ty, { steps: 8 })
  await page.mouse.up()
}
