import type { Page } from "@playwright/test";
export async function manage(page: Page, action: string) {
  await page.getByRole("button", { name: "Manage dashboard" }).click();
  await page.getByRole("menuitem", { name: action, exact: true }).click();
}
export async function inspect(page: Page, label: string) {
  const card = page
    .getByTestId("item-card")
    .filter({ has: page.getByRole("heading", { name: label, exact: true }) });
  const metrics = card.getByRole("button", { name: `Inspect ${label}`, exact: true });
  if (await metrics.count()) {
    await metrics.click();
  } else {
    await card.getByRole("button", { name: `Status for ${label}`, exact: false }).click();
    await card.getByRole("button", { name: "Service details", exact: true }).click();
  }
}
export async function configure(page: Page, label?: string) {
  if (label) await inspect(page, label);
  else
    await page
      .getByRole("button", { name: /^Inspect / })
      .first()
      .click();
  await page.getByRole("button", { name: "Configure", exact: true }).click();
}
