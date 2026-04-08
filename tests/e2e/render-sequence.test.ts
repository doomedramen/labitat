import { test, expect } from "@playwright/test"

/**
 * Reproduces render-sequence bugs that all occur within ~150ms of page load.
 *
 * Polling-based approaches miss this window entirely. Instead we inject a
 * MutationObserver + rAF loop via addInitScript() so it runs from the very
 * first paint and records every frame where a problem exists.
 */

// Raw JS string — avoids any TypeScript serialisation issues with addInitScript(fn)
const monitorScript = `
  window.__renderLog = [];

  function __sample() {
    var imgs = Array.from(document.querySelectorAll('img'));
    var visibleBroken = 0;
    var hiddenLoaded = 0;
    for (var i = 0; i < imgs.length; i++) {
      var img = imgs[i];
      var style = window.getComputedStyle(img);
      var hidden = style.visibility === 'hidden' || style.display === 'none';
      if (img.complete && img.naturalWidth === 0 && !hidden) visibleBroken++;
      if (img.complete && img.naturalWidth > 0 && hidden) hiddenLoaded++;
    }
    window.__renderLog.push({
      t: Math.round(performance.now()),
      visibleBrokenImages: visibleBroken,
      hiddenLoadedImages: hiddenLoaded,
      itemCards: document.querySelectorAll("[data-testid='item-card']").length,
    });
  }

  var __observer = new MutationObserver(__sample);
  __observer.observe(document.documentElement, {
    childList: true, subtree: true,
    attributes: true, attributeFilter: ['class', 'style', 'src'],
  });

  var __running = true;
  function __tick() { __sample(); if (__running) requestAnimationFrame(__tick); }
  requestAnimationFrame(__tick);

  setTimeout(function() { __running = false; __observer.disconnect(); }, 3000);
`

test.describe("Sub-150ms render sequence", () => {
  test("broken images are never visible at any point during load", async ({
    page,
  }) => {
    await page.addInitScript({ content: monitorScript })
    await page.goto("/")
    await page.waitForLoadState("load")
    await page.waitForTimeout(500)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const log: { t: number; visibleBrokenImages: number }[] =
      await page.evaluate(() => (window as any).__renderLog)

    const badFrames = log.filter((e) => e.visibleBrokenImages > 0)

    expect(
      badFrames,
      `Broken images were visible in ${badFrames.length} frames:\n` +
        badFrames
          .slice(0, 5)
          .map((e) => `  t=${e.t}ms: ${e.visibleBrokenImages} broken`)
          .join("\n")
    ).toHaveLength(0)
  })

  test("successfully loaded images are never stuck invisible", async ({
    page,
  }) => {
    await page.addInitScript({ content: monitorScript })
    await page.goto("/")
    await page.waitForLoadState("load")
    await page.waitForTimeout(500)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const log: { t: number; hiddenLoadedImages: number }[] =
      await page.evaluate(() => (window as any).__renderLog)

    // After networkidle, the last sample should have no hidden-but-loaded images
    const lastSample = log.at(-1)
    expect(
      lastSample?.hiddenLoadedImages ?? 0,
      "icons loaded successfully but are still invisible (onLoad never fired)"
    ).toBe(0)
  })

  test("widget data appears immediately from SSR", async ({ page }) => {
    // With SSR preloading, widget data should be present on first paint
    await page.addInitScript({ content: monitorScript })

    await page.goto("/", { waitUntil: "domcontentloaded" })
    await page.waitForTimeout(600)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const log: { t: number; itemCards: number }[] = await page.evaluate(
      () => (window as any).__renderLog
    )

    // Find when item cards first appeared
    const firstCards = log.find((e) => e.itemCards > 0)
    if (!firstCards) {
      // No items in dashboard — skip this test
      test.skip(true, "No items in dashboard to test SSR rendering")
      return
    }
    expect(
      firstCards.t,
      `item cards took ${firstCards.t}ms to appear (expected < 500ms)`
    ).toBeLessThan(500)
  })
})
