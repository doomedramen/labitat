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

    // Verify 2-column grid layout
    const grid = page.locator('[class*="grid-cols-2"]');
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
      "Diagonal",
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
      await expect(page.getByText(bg)).toBeVisible();
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

    // Should see "Adjust scale & opacity" button
    await expect(page.getByText("Adjust scale & opacity")).toBeVisible();

    // Click to show controls
    await page.getByText("Adjust scale & opacity").click();
    await page.waitForTimeout(200);

    // Sliders should be visible
    await expect(page.getByText("Scale")).toBeVisible();
    await expect(page.getByText("Opacity")).toBeVisible();
  });

  test("scale slider updates CSS variable", async ({ page }) => {
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

    // Show controls
    await page.getByText("Adjust scale & opacity").click();
    await page.waitForTimeout(200);

    // Get initial scale
    const initialScale = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg-scale"),
    );
    expect(initialScale.trim()).toBe("1");

    // Adjust scale slider (first thumb)
    const scaleSlider = page.locator('[data-slot="slider"]').first();
    await scaleSlider.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(300);

    // Scale should have changed
    const newScale = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg-scale"),
    );
    expect(parseFloat(newScale)).toBeGreaterThan(1);
  });

  test("opacity slider updates CSS variable", async ({ page }) => {
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

    // Show controls
    await page.getByText("Adjust scale & opacity").click();
    await page.waitForTimeout(200);

    // Get initial opacity
    const initialOpacity = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg-opacity"),
    );
    expect(initialOpacity.trim()).toBe("1");

    // Adjust opacity slider
    const opacitySlider = page.locator('[data-slot="slider"]').last();
    await opacitySlider.focus();
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(300);

    // Opacity should have changed
    const newOpacity = await page.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue("--bg-opacity"),
    );
    expect(parseFloat(newOpacity)).toBeLessThan(1);
  });

  test("scale and opacity persist across reload", async ({ page }) => {
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

    // Show controls
    await page.getByText("Adjust scale & opacity").click();
    await page.waitForTimeout(200);

    // Change scale
    const scaleSlider = page.locator('[data-slot="slider"]').first();
    await scaleSlider.focus();
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(500);

    // Change opacity
    const opacitySlider = page.locator('[data-slot="slider"]').last();
    await opacitySlider.focus();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(500);

    // Reload
    await page.reload();
    await page.waitForLoadState("domcontentloaded");

    // Check cookies
    const cookies = await page.context().cookies();
    const scaleCookie = cookies.find((c) => c.name === "labitat-bg-scale");
    const opacityCookie = cookies.find((c) => c.name === "labitat-bg-opacity");

    expect(scaleCookie).toBeDefined();
    expect(opacityCookie).toBeDefined();
    expect(parseFloat(scaleCookie!.value)).toBeGreaterThan(1);
    expect(parseFloat(opacityCookie!.value)).toBeLessThan(1);
  });
});
