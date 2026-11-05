import { test, expect } from "@playwright/test";
for (const direction of ["precision", "slate"]) {
  for (const theme of ["dark", "light"]) {
    test(`${direction} ${theme}: responsive visual matrix`, async ({ page }, info) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`/?direction=${direction}&theme=${theme}`);
      await expect(page.locator(".service")).toHaveCount(34);
      await page.evaluate(() => document.fonts.ready);
      for (const width of [320, 390, 430, 768, 1440, 1920]) {
        await page.setViewportSize({ width, height: width < 640 ? 844 : 900 });
        await expect
          .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
          .toBe(true);
        // Verify actual metric text doesn't collide with its neighbouring value.
        const collisions = await page.locator(".metrics").evaluateAll((grids) =>
          grids.flatMap((grid) => {
            const values = Array.from(grid.querySelectorAll(".metric strong"));
            return values
              .slice(0, -1)
              .filter((el, i) => {
                const a = el.getBoundingClientRect(),
                  b = values[i + 1].getBoundingClientRect();
                return Math.abs(a.top - b.top) < 4 && a.right > b.left;
              })
              .map(() => "metric collision");
          }),
        );
        expect(collisions).toEqual([]);
        if (info.project.name === "chromium")
          await page.screenshot({
            path: info.outputPath(`${direction}-${theme}-${width}.png`),
            fullPage: true,
          });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      const undersized = await page
        .locator("button:visible, select:visible, summary:visible, .service a:visible")
        .evaluateAll((elements) =>
          elements
            .filter((el) => {
              const r = el.getBoundingClientRect();
              return r.height < 43.5;
            })
            .map((el) => el.textContent),
        );
      expect(undersized).toEqual([]);
      await page.emulateMedia({ reducedMotion: "reduce" });
      await page.getByRole("button", { name: "Details for Plex", exact: true }).click();
      await expect(page.getByRole("dialog")).toBeVisible();
      expect(
        await page.getByRole("dialog").evaluate((el) => getComputedStyle(el).animationName),
      ).toBe("none");
      expect(errors).toEqual([]);
    });
  }
  test(`${direction}: complete operator walkthrough`, async ({ page }, info) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/?direction=${direction}`);
    await page.getByRole("button", { name: "Show 2 more downloads" }).click();
    await expect(page.getByText("Planet Earth III", { exact: true })).toBeVisible();
    const activity = page.getByRole("button", { name: /Silo/ });
    await activity.click();
    await expect(page).toHaveURL(/service=qbittorrent/);
    await expect(page.getByRole("dialog")).toContainText("qBittorrent");
    await page.getByRole("button", { name: "Close details" }).click();
    await expect(activity).toBeFocused();
    await page.keyboard.press("/");
    await expect(page.getByRole("textbox", { name: "Find a service" })).toBeFocused();
    await page.getByRole("textbox", { name: "Find a service" }).fill("proxmox");
    await expect(page.locator(".service")).toHaveCount(4);
    await page.getByRole("button", { name: "Clear search" }).click();
    await page.getByRole("button", { name: "Needs attention" }).click();
    await expect(page.locator(".service")).toHaveCount(4);
    await page.getByRole("button", { name: "Stale", exact: false }).click();
    await expect(page.locator(".service")).toHaveCount(3);
    await page.getByRole("button", { name: "All 34", exact: true }).click();
    await page.getByRole("combobox", { name: "Filter by group" }).selectOption("Media");
    await expect(page.locator(".service")).toHaveCount(6);
    await page.getByRole("button", { name: "Details for Plex", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Bandwidth");
    await page.reload();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.getByRole("button", { name: "Close details" }).click();
    await page.getByRole("button", { name: "Arrange", exact: true }).click();
    await page.getByRole("combobox", { name: "Group for Plex", exact: true }).selectOption("Home");
    await expect(
      page
        .locator(".service-group")
        .filter({ has: page.getByRole("heading", { name: "Home", exact: true }) })
        .locator('[data-id="plex"]'),
    ).toHaveCount(1);
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await expect(
      page
        .locator(".service-group")
        .filter({ has: page.getByRole("heading", { name: "Media", exact: true }) })
        .locator('[data-id="plex"]'),
    ).toHaveCount(1);
    await page.getByRole("button", { name: "Arrange", exact: true }).click();
    await page.getByRole("button", { name: "Move Plex up", exact: true }).click();
    await page.getByText("Review tools", { exact: true }).click();
    await page.getByRole("combobox", { name: "Save outcome" }).selectOption("failure");
    await page.getByText("Review tools", { exact: true }).click();
    await page.getByRole("button", { name: "Save arrangement" }).click();
    await expect(page.getByRole("button", { name: "Saving…" })).toBeDisabled();
    await expect(page.getByRole("alert")).toContainText("Could not save");
    await page.getByRole("button", { name: "Restore connection" }).click();
    await page.getByRole("button", { name: "Save arrangement" }).click();
    await expect(page.getByRole("status")).toContainText("Arrangement saved");
    await expect(page.locator(".service").first()).toHaveAttribute("data-id", "plex");
    await page.getByRole("button", { name: "Arrange", exact: true }).click();
    await page.getByText("Review tools", { exact: true }).click();
    await page.getByRole("combobox", { name: "Save outcome" }).selectOption("conflict");
    await page.getByText("Review tools", { exact: true }).click();
    await page.getByRole("button", { name: "Save arrangement" }).click();
    await expect(page.getByRole("alert")).toContainText("another session");
    await page.getByRole("button", { name: "Reload saved layout" }).click();
    await page.getByRole("button", { name: "Cancel", exact: true }).click();
    await page.getByText("Review tools", { exact: true }).click();
    await page.getByRole("combobox", { name: "Scenario" }).selectOption("disconnected");
    await expect(page.locator(".activity-row")).toHaveCount(0);
    await page.getByRole("combobox", { name: "Scenario" }).selectOption("idle");
    await expect(page.getByText("No active downloads.")).toBeVisible();
    await page.getByRole("combobox", { name: "Scenario" }).selectOption("hidden");
    await expect(page.locator(".metric")).toHaveCount(0);
    await page.getByRole("combobox", { name: "Scenario" }).selectOption("stress");
    await page.getByText("Review tools", { exact: true }).click();
    await page.setViewportSize({ width: 320, height: 844 });
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
    await page.getByRole("button", { name: "Details for Catacomb", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("primary virtualisation");
    await page.screenshot({ path: info.outputPath("mobile-details.png") });
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).not.toBeVisible();
    await page.setViewportSize({ width: 720, height: 450 }); // CSS viewport equivalent of 200% at 1440x900.
    await expect
      .poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth))
      .toBe(true);
  });
}

test("metric controls, keyboard tabs, drag, empty group, and independent launch", async ({
  page,
  context,
}) => {
  const writes: string[] = [];
  page.on("request", (request) => {
    if (!["GET", "HEAD"].includes(request.method())) writes.push(request.url());
  });
  await page.goto("/?direction=slate");
  await page.getByRole("button", { name: "Details for Plex", exact: true }).click();
  await page.getByRole("tab", { name: "Overview", exact: true }).focus();
  await page.keyboard.press("End");
  await expect(page.getByRole("tab", { name: "Settings" })).toBeFocused();
  await expect(page.getByRole("tab", { name: "Settings" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  await page.getByRole("button", { name: "Hide Streams", exact: true }).click();
  await expect(page.getByRole("button", { name: "Show Streams", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Show Streams", exact: true }).click();
  await page.getByRole("tab", { name: "Overview", exact: true }).click();
  await expect(page.locator(".detail-metrics > div")).toHaveCount(5);
  await page.keyboard.press("Escape");
  await expect(page.locator('[data-id="plex"] .metric')).toHaveCount(4);
  await context.route("https://plex.example.test/**", (route) =>
    route.fulfill({ body: "Synthetic launch destination" }),
  );
  const popupPromise = page.waitForEvent("popup");
  await page.locator('[data-id="plex"] .service-identity a').click();
  const popup = await popupPromise;
  await expect(popup).toHaveURL("https://plex.example.test/");
  await popup.close();
  await expect(page.getByRole("dialog")).not.toBeVisible();
  await page.setViewportSize({ width: 1440, height: 1800 });
  await page.getByRole("button", { name: "Arrange", exact: true }).click();
  await page
    .getByRole("button", { name: "Drag Plex", exact: true })
    .dragTo(page.locator('[data-id="radarr"]'));
  await expect(page.getByRole("combobox", { name: "Group for Plex", exact: true })).toHaveValue(
    "Arr",
  );
  await page.getByRole("combobox", { name: "Group for SABnzbd", exact: true }).selectOption("Home");
  await page
    .getByRole("combobox", { name: "Group for qBittorrent", exact: true })
    .selectOption("Home");
  await expect(page.getByText("Move a service here", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Move Downloads group up", exact: true }).click();
  await page.getByRole("button", { name: "Cancel", exact: true }).click();
  await expect(
    page.locator(".service-group").nth(1).getByRole("heading", { name: "Arr", exact: true }),
  ).toBeVisible();
  expect(writes).toEqual([]);
});

test.describe("touch input", () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });
  test("phone detail navigation and arrangement controls", async ({ page }) => {
    await page.goto("/?direction=slate");
    await page.getByRole("button", { name: "Details for Seerr", exact: true }).tap();
    await expect(page.getByRole("dialog")).toBeVisible();
    expect(
      await page.getByRole("dialog").evaluate((el) => Math.round(el.getBoundingClientRect().width)),
    ).toBe(390);
    await page.getByRole("button", { name: "Close details" }).tap();
    await expect(
      page.getByRole("button", { name: "Details for Seerr", exact: true }),
    ).toBeFocused();
    await page.getByRole("button", { name: "Arrange", exact: true }).tap();
    await page.getByRole("button", { name: "Move Plex up", exact: true }).tap();
    await page.getByRole("button", { name: "Save arrangement", exact: true }).tap();
    await expect(page.getByRole("status")).toContainText("Arrangement saved");
    await expect(page.locator(".service").first()).toHaveAttribute("data-id", "plex");
  });
});
