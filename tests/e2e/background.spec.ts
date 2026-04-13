import { test, expect, seedAndAuth, SEED_GROUPS } from "../fixtures";

test.describe("Background Picker", () => {
  test("background picker button is visible and clickable", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    // Background picker button should be visible
    const backgroundButton = page.getByRole("button", {
      name: "Background settings",
    });
    await expect(backgroundButton).toBeVisible();

    // Click the button to open dropdown
    await backgroundButton.click();

    // Dropdown should contain background options
    await expect(page.getByText("None")).toBeVisible();
    await expect(page.getByText("Boxes")).toBeVisible();
  });

  test("selecting a background updates the data-background attribute", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    // Initial background should be "none"
    await expect(page.locator("html")).toHaveAttribute("data-background", "none");

    // Open background picker
    await page.getByRole("button", { name: "Background settings" }).click();

    // Select "Boxes" background
    await page.getByText("Boxes").click();

    // Wait for the background to update
    await page.waitForTimeout(300);

    // data-background attribute should be updated
    await expect(page.locator("html")).toHaveAttribute("data-background", "boxes");
  });

  test("selected background persists in cookie", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    // Open background picker and select a background
    await page.getByRole("button", { name: "Background settings" }).click();
    await page.getByText("Boxes").click();

    // Wait for cookie to be set
    await page.waitForTimeout(300);

    // Check cookie exists
    const cookies = await page.context().cookies();
    const backgroundCookie = cookies.find((c) => c.name === "labitat-background");
    expect(backgroundCookie).toBeDefined();
    expect(backgroundCookie?.value).toBe("boxes");
  });

  test("background CSS is applied to body element", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    // Open background picker and select a background
    await page.getByRole("button", { name: "Background settings" }).click();
    await page.getByText("Boxes").click();

    // Wait for background to be applied
    await page.waitForTimeout(300);

    // Verify the data-background attribute is set
    await expect(page.locator("html")).toHaveAttribute("data-background", "boxes");

    // Check that body has background-image applied
    const bodyBackground = await page.evaluate(() => {
      const body = document.body;
      const style = window.getComputedStyle(body);
      return {
        backgroundImage: style.backgroundImage,
        backgroundColor: style.backgroundColor,
      };
    });

    // The body should have a background-image when a background is selected
    expect(bodyBackground.backgroundImage).not.toBe("none");
  });

  test("background switcher shows checkmark for selected background", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    // Open background picker
    await page.getByRole("button", { name: "Background settings" }).click();

    // "None" should have a checkmark initially
    const noneItem = page.locator('[role="menuitem"]').filter({
      hasText: "None",
    });
    await expect(noneItem.locator("svg")).toBeVisible();

    // Select "Boxes"
    await page.getByText("Boxes").click();

    // Wait for update and press Escape to close dropdown
    await page.waitForTimeout(300);
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);

    // Reopen background picker
    await page.getByRole("button", { name: "Background settings" }).click();

    // Now "Boxes" should have a checkmark
    const boxesItem = page.locator('[role="menuitem"]').filter({
      hasText: "Boxes",
    });
    await expect(boxesItem.locator("svg")).toBeVisible();
  });

  test("background preview swatches are visible in 2-column grid", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    // Open background picker
    await page.getByRole("button", { name: "Background settings" }).click();

    // Preview swatches should be visible (90x90 divs)
    const swatches = page.locator('[class*="h-[90px]"]');
    await expect(swatches.first()).toBeVisible();

    // There should be multiple swatches (one per background option)
    const count = await swatches.count();
    expect(count).toBeGreaterThan(1);

    // Verify 2-column grid layout (scoped to background dropdown)
    const dropdown = page.locator('[data-slot="dropdown-menu-content"]');
    const grid = dropdown.locator("div.grid-cols-2");
    await expect(grid).toBeVisible();
  });

  test("background selection survives page reload", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    // Select a background
    await page.getByRole("button", { name: "Background settings" }).click();
    await page.getByText("Boxes").click();

    // Wait for update
    await page.waitForTimeout(300);

    // Reload the page
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Background should persist
    await expect(page.locator("html")).toHaveAttribute("data-background", "boxes");
  });

  test("all background options are available", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    // Open background picker
    await page.getByRole("button", { name: "Background settings" }).click();

    // All background options should be visible
    const expectedBackgrounds = [
      "None",
      "Boxes",
      "Circles",
      "Crosses",
      "Diagonal 2",
      "Diagonal 3",
      "Isometric",
      "Lines",
      "Lines 2",
      "Lines 3",
      "Lines 4",
      "Moon",
      "Paper",
      "Polka",
      "Polka 2",
      "Rectangles",
      "Rhombus",
      "Triangles",
      "Triangles 2",
      "Wavy",
      "Zigzag",
      "Zigzag 3D",
    ];

    for (const bg of expectedBackgrounds) {
      await expect(page.getByText(bg, { exact: true })).toBeVisible();
    }
  });

  test("scale and opacity controls appear when background is selected", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    // Select a background
    await page.getByRole("button", { name: "Background settings" }).click();
    await page.getByText("Boxes").click();
    await page.waitForTimeout(300);

    // Reopen picker
    await page.keyboard.press("Escape");
    await page.waitForTimeout(200);
    await page.getByRole("button", { name: "Background settings" }).click();

    // Scale and opacity sliders should be visible at the top
    await expect(page.getByTestId("scale-control")).toBeVisible();
    await expect(page.getByTestId("opacity-control")).toBeVisible();
  });

  test("scale slider updates CSS variable", async ({ page }) => {
    // Set scale cookie before navigation
    await page
      .context()
      .addCookies([{ name: "labitat-bg-scale", value: "1.5", domain: "localhost", path: "/" }]);

    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");
    await page.waitForTimeout(100);

    const scale = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg-scale"),
    );
    expect(parseFloat(scale)).toBe(1.5);
  });

  test("opacity slider updates CSS variable", async ({ page }) => {
    // Set opacity cookie before navigation
    await page
      .context()
      .addCookies([{ name: "labitat-bg-opacity", value: "0.5", domain: "localhost", path: "/" }]);

    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");
    await page.waitForTimeout(100);

    const opacity = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg-opacity"),
    );
    expect(parseFloat(opacity)).toBe(0.5);
  });

  test("scale and opacity persist across reload", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    // Set scale and opacity via cookies
    await page.context().addCookies([
      { name: "labitat-bg-scale", value: "1.5", domain: "localhost", path: "/" },
      { name: "labitat-bg-opacity", value: "0.5", domain: "localhost", path: "/" },
    ]);

    // Reload
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Check cookies persist
    const cookies = await page.context().cookies();
    const scaleCookie = cookies.find((c) => c.name === "labitat-bg-scale");
    const opacityCookie = cookies.find((c) => c.name === "labitat-bg-opacity");

    expect(scaleCookie).toBeDefined();
    expect(opacityCookie).toBeDefined();
    expect(parseFloat(scaleCookie!.value)).toBe(1.5);
    expect(parseFloat(opacityCookie!.value)).toBe(0.5);
  });
});
