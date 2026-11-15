import type { Page } from "@playwright/test";
import { configure } from "../helpers/operator";
import { test, expect, seedAndAuth } from "../fixtures";
import { dragAndDropInDialog } from "../helpers/dnd";

const RADARR_URL = "https://radarr.test";

/** Radarr's defaults: Queued is the main stat; Missing, Wanted and Movies follow. */
test.describe("Card stat picker", () => {
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
              cachedWidgetData: { queued: 5, missing: 3, wanted: 7, movies: 42 },
            },
          ],
        },
      ],
    });
  });

  async function openPicker(page: Page) {
    await page.goto("/");
    await expect(page.getByText("Movies").first()).toBeVisible({ timeout: 15_000 });
    await configure(page, "Radarr");
    const dialog = page.getByRole("dialog", { name: "Edit Item" });
    await expect(dialog.getByLabel("Main stat")).toBeVisible();
    return dialog;
  }
  const extras = (dialog: ReturnType<Page["getByRole"]>) =>
    dialog.getByRole("list", { name: "Extra stats, in order" }).getByTestId("stat-card");
  const card = (page: Page) =>
    page
      .getByTestId("item-card")
      .filter({ has: page.getByRole("heading", { name: "Radarr", exact: true }) });

  test("choosing a main stat updates the preview and the saved card", async ({ page }) => {
    const dialog = await openPicker(page);
    await expect(dialog.getByLabel("Main stat")).toHaveValue("queued");
    await expect(extras(dialog)).toHaveText([/Missing/, /Wanted/, /Movies/]);

    await dialog.getByLabel("Main stat").selectOption("movies");
    // The previous main stat becomes the first extra instead of disappearing.
    await expect(extras(dialog)).toHaveText([/Queued/, /Missing/, /Wanted/]);
    await expect(dialog.getByRole("figure", { name: "Card preview" })).toContainText(/42\s*Movies/);

    await dialog.getByRole("button", { name: "Update" }).click();
    await expect(dialog).toBeHidden();
    await page.reload();
    // Stats keep their chosen order on the card whether or not the service is healthy.
    const text = (await card(page).getByRole("button", { name: "Inspect Radarr" }).textContent())!;
    expect(text.indexOf("Movies")).toBeLessThan(text.indexOf("Queued"));
  });

  test("extras reorder with arrows and by dragging", async ({ page }) => {
    const dialog = await openPicker(page);
    await dialog.getByRole("button", { name: "Move Missing down" }).click();
    await expect(extras(dialog)).toHaveText([/Wanted/, /Missing/, /Movies/]);
    await expect(dialog.getByRole("button", { name: "Move Wanted up" })).toBeDisabled();

    await dragAndDropInDialog(
      page,
      extras(dialog).nth(2).getByRole("button", { name: "Drag Movies" }),
      extras(dialog).nth(0),
    );
    await expect(extras(dialog)).toHaveText([/Movies/, /Wanted/, /Missing/]);
  });

  test("extras can be removed and added back", async ({ page }) => {
    const dialog = await openPicker(page);
    await dialog.getByRole("button", { name: "Remove Wanted" }).click();
    await expect(extras(dialog)).toHaveText([/Missing/, /Movies/]);

    const add = dialog.getByRole("group", { name: "Add a stat" });
    await add.getByRole("button", { name: "Add Wanted" }).click();
    await expect(extras(dialog)).toHaveText([/Missing/, /Movies/, /Wanted/]);
    await expect(add).toHaveCount(0);
  });

  test("no main stat shows the service as a link, and reset restores defaults", async ({
    page,
  }) => {
    const dialog = await openPicker(page);
    await dialog.getByLabel("Main stat").selectOption({ label: "None, show as a link" });
    await expect(dialog.getByRole("figure", { name: "Card preview" })).toContainText(
      "Shown as a link",
    );
    await expect(dialog.getByRole("list", { name: "Extra stats, in order" })).toHaveCount(0);

    await dialog.getByRole("button", { name: "Reset to defaults" }).click();
    await expect(dialog.getByLabel("Main stat")).toHaveValue("queued");

    await dialog.getByLabel("Main stat").selectOption({ label: "None, show as a link" });
    await dialog.getByRole("button", { name: "Update" }).click();
    await expect(dialog).toBeHidden();
    await expect(card(page)).toHaveAttribute("data-layout", "launcher");
  });
});
