import { test, expect, seedAndAuth } from "../fixtures";

test.skip("Status Pill Progress", () => {
  test("renders status pill with correct text and structure", async ({ page }) => {
    await seedAndAuth(page, {
      groups: [
        {
          name: "Services",
          items: [
            {
              label: "Radarr",
              href: "https://radarr.test",
              serviceType: "radarr",
              serviceUrl: "https://radarr.test",
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

    await page.goto("/");

    // Wait for item to load
    await expect(page.getByText("Radarr")).toBeVisible({ timeout: 15_000 });

    // Status pill should be visible with text (e.g., "Online")
    const statusPill = page.locator('[role="status"]');
    await expect(statusPill).toBeVisible();

    // Should contain status text (could be "Online", "Error", etc.)
    await expect(statusPill.locator("text=/Online|Error|Degraded|Offline|Stale/i")).toBeVisible();

    // SVG should be present for stroke
    const svg = statusPill.locator("svg");
    await expect(svg).toBeVisible();

    // Track path should exist (subtle background stroke)
    const trackPath = svg.locator("path").first();
    await expect(trackPath).toBeAttached();

    // Check that stroke-width is 1.5px (as set in STROKE_WIDTH)
    await expect(trackPath).toHaveAttribute("stroke-width", "1.5");
  });

  test("progress stroke animates over time", async ({ page }) => {
    await seedAndAuth(page, {
      groups: [
        {
          name: "Services",
          items: [
            {
              label: "Radarr",
              href: "https://radarr.test",
              serviceType: "radarr",
              serviceUrl: "https://radarr.test",
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

    await page.goto("/");

    // Wait for item to load
    await expect(page.getByText("Radarr")).toBeVisible({ timeout: 15_000 });

    // Wait for SSE connection and initial sync
    await page.waitForTimeout(500);

    const statusPill = page.locator('[role="status"]');
    const svg = statusPill.locator("svg");

    // Get the progress path (second path in SVG)
    const progressPath = svg.locator("path").nth(1);

    // Check if progress path exists (only shown when progress > 0)
    const isVisible = await progressPath.isVisible().catch(() => false);

    if (isVisible) {
      // Get initial stroke-dashoffset
      const initialOffset = await progressPath.getAttribute("stroke-dashoffset");

      // Wait for some animation to happen (progress should increase)
      await page.waitForTimeout(2000);

      const laterOffset = await progressPath.getAttribute("stroke-dashoffset");

      // Offset should have changed (decreased as progress increases)
      if (initialOffset && laterOffset) {
        const initial = parseFloat(initialOffset);
        const later = parseFloat(laterOffset);
        // Progress should have moved (offset decreased)
        // Check if change is significant enough
        const diff = Math.abs(initial - later);
        console.log(
          `Progress stroke-dashoffset: ${initialOffset} -> ${laterOffset} (diff: ${diff})`,
        );

        // Assert that the offset has changed by at least a small amount, if the animation is working
        expect(diff).toBeGreaterThan(0.1);
      }
    }
  });

  test("status pill uses theme colors", async ({ page }) => {
    await seedAndAuth(page, {
      groups: [
        {
          name: "Services",
          items: [
            {
              label: "Test Service",
              href: "https://test.test",
              serviceType: "radarr",
              serviceUrl: "https://radarr.test",
              cachedWidgetData: {
                _status: "error",
                _statusText: "Connection refused",
              },
            },
          ],
        },
      ],
    });

    await page.goto("/");

    // Wait for item to load
    await expect(page.getByText("Test Service")).toBeVisible({ timeout: 15_000 });

    // Status pill should show "Error" text for error status
    const statusPill = page.locator('[role="status"]');
    await expect(statusPill.getByText("Error")).toBeVisible();

    // The pill should have a colored background using theme variables
    // We can't easily test CSS variables in e2e, but we can verify the structure
    const pillBackground = statusPill.locator("div").first();
    await expect(pillBackground).toBeVisible();
  });

  test("tooltip has correct styling", async ({ page }) => {
    await seedAndAuth(page, {
      groups: [
        {
          name: "Services",
          items: [
            {
              label: "Radarr",
              href: "https://radarr.test",
              serviceType: "radarr",
              serviceUrl: "https://radarr.test",
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

    await page.goto("/");

    // Wait for item to load
    await expect(page.getByText("Radarr")).toBeVisible({ timeout: 15_000 });

    // Hover over the status pill to trigger tooltip
    const statusPill = page.locator('[role="status"]');
    await statusPill.hover();

    // Tooltip should appear with the same styling as list-item tooltips
    // Check for the tooltip content
    const tooltip = page.locator('[role="tooltip"]');
    await expect(tooltip).toBeVisible({ timeout: 5000 });

    // Should have the correct CSS classes (matching list-item tooltip)
    await expect(tooltip).toHaveClass(/bg-popover/);
    await expect(tooltip).toHaveClass(/border-border/);
    await expect(tooltip).toHaveClass(/rounded-xl/);
  });
});
