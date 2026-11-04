import type { Page } from "@playwright/test";
export async function manage(page: Page, action: string) {
  await page.getByRole("button", { name: "Manage dashboard" }).click();
  await page.getByRole("menuitem", { name: action, exact: true }).click();
}
export async function configure(page: Page, label?: string) {
  await (
    label
      ? page.getByRole("button", { name: `Inspect ${label}`, exact: true })
      : page.getByRole("button", { name: /^Inspect / }).first()
  ).click();
  await page.getByRole("button", { name: "Configure", exact: true }).click();
}
