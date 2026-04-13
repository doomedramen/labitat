import { test, expect, seedAndAuth } from "../fixtures";

test.describe("PWA Manifest", () => {
  test("manifest.ts file defines correct properties", async ({ page }) => {
    // Seed admin so middleware doesn't redirect /manifest.webmanifest to /setup
    await seedAndAuth(page);
    const response = await page.request.get("/manifest.webmanifest");
    expect(response.ok()).toBe(true);

    const manifest = await response.json();
    expect(manifest.name).toBe("Labitat");
    expect(manifest.short_name).toBe("Labitat");
    expect(manifest.start_url).toBe("/");
    expect(manifest.display).toBe("standalone");
    expect(Array.isArray(manifest.icons)).toBe(true);
    expect(manifest.icons.length).toBeGreaterThan(0);
  });
});
