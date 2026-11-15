import type { Page } from "@playwright/test";
export async function manage(page: Page, action: string) {
  await page.getByRole("button", { name: "Manage dashboard" }).click();
  await page.getByRole("menuitem", { name: action, exact: true }).click();
}
export async function inspect(page: Page, label: string) {
  const card = page
    .getByTestId("item-card")
    .filter({ has: page.getByRole("heading", { name: label, exact: true }) });
  // The status dot is the only way to open a service's details.
  await card.getByRole("button", { name: `Status for ${label}`, exact: false }).click();
}
export async function configure(page: Page, label?: string) {
  if (label) await inspect(page, label);
  else
    await page
      .getByRole("button", { name: /^Status for / })
      .first()
      .click();
  await page.getByRole("button", { name: "Configure", exact: true }).click();
}

type Box = { left: number; right: number; top: number; bottom: number };
/** True when no two boxes overlap (edges may touch). */
export function noOverlap(boxes: Box[]) {
  return boxes.every((a, i) =>
    boxes
      .slice(i + 1)
      .every(
        (b) =>
          a.right <= b.left + 0.5 ||
          b.right <= a.left + 0.5 ||
          a.bottom <= b.top + 0.5 ||
          b.bottom <= a.top + 0.5,
      ),
  );
}
