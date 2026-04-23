import { test, expect, seedAndAuth, SEED_GROUPS } from "../fixtures";

test.describe("SSR Rendering", () => {
  test("SSR HTML contains all groups and items (response.text)", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });

    const response = await page.goto("/");
    expect(response?.ok()).toBe(true);

    const html = await response!.text();

    // Dashboard title
    expect(html).toContain("Labitat");

    // Groups
    expect(html).toContain("Infrastructure");
    expect(html).toContain("Media");

    // Items
    expect(html).toContain("Proxmox");
    expect(html).toContain("Grafana");
    expect(html).toContain("Jellyfin");

    // Links should be server-rendered
    expect(html).toContain('href="https://proxmox.test"');
    expect(html).toContain('href="https://grafana.test"');
    expect(html).toContain('href="https://jellyfin.test"');
  });

  test("SSR renders all required UI elements visible (response.text)", async ({ page }) => {
    // Seed admin user (creates session) but then clear cookies to be unauthenticated
    await page.request.post("/api/test/seed", {
      headers: { "x-test-secret": "e2e-test-reset-token" },
      data: {
        admin: { email: "admin@test.com", password: "password123" },
        groups: SEED_GROUPS,
      },
    });
    await page.context().clearCookies();

    const response = await page.goto("/");
    expect(response?.ok()).toBe(true);

    const html = await response!.text();

    // ── Dashboard title visible ──
    expect(html).toMatch(/<h1[^>]*>.*Labitat.*<\/h1>/i);

    // ── Multiple groups visible ──
    expect(html).toMatch(/<h2[^>]*>.*Infrastructure.*<\/h2>/i);
    expect(html).toMatch(/<h2[^>]*>.*Media.*<\/h2>/i);

    // ── Multiple item-cards with titles visible ──
    expect(html).toContain("Proxmox");
    expect(html).toContain("Grafana");
    expect(html).toContain("Jellyfin");

    // ── Palette picker button visible ──
    expect(html).toContain("Theme settings");

    // ── Background picker button visible ──
    expect(html).toContain("Background settings");

    // ── Sign-in button visible (not authenticated) ──
    expect(html).toMatch(/<button[^>]*>.*Sign in.*<\/button>/i);

    // ── Edit button should NOT be visible when not authenticated ──
    expect(html).not.toMatch(/<button[^>]*>.*Edit.*<\/button>/i);
  });

  test("SSR renders Edit button when authenticated (response.text)", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });

    const response = await page.goto("/");
    expect(response?.ok()).toBe(true);

    const html = await response!.text();

    // ── Edit button visible when authenticated ──
    expect(html).toMatch(/<button[^>]*>.*Edit.*<\/button>/i);

    // ── Sign-in button should NOT be visible when authenticated ──
    expect(html).not.toContain("Sign in");
  });

  test("SSR renders stat cards with labels AND values when cached data exists (response.text)", async ({
    page,
  }) => {
    // Seed with cached widget data that will produce stat cards
    await seedAndAuth(page, {
      groups: [
        {
          name: "Servers",
          items: [
            {
              label: "Proxmox",
              href: "https://proxmox.test",
              serviceType: "proxmox",
              serviceUrl: "https://proxmox.test",
              cachedWidgetData: {
                nodes: 3,
                vms: 10,
                containers: 5,
                runningVMs: 8,
                runningContainers: 4,
                cpuUsage: 45.2,
                memoryUsage: 68.5,
                memoryUsed: "32 GB",
                memoryTotal: "64 GB",
              },
            },
          ],
        },
      ],
    });

    // Give the server cache time to populate
    await page.waitForTimeout(500);

    const response = await page.goto("/");
    expect(response?.ok()).toBe(true);

    const html = await response!.text();

    // ── Item card visible ──
    expect(html).toContain("Proxmox");

    // ── Stat card labels MUST be visible during SSR ──
    expect(html).toContain("Nodes");
    expect(html).toContain("VMs");
    expect(html).toContain("LXCs");
    expect(html).toContain("CPU");
    expect(html).toContain("Memory");

    // ── Stat card values MUST be visible during SSR ──
    expect(html).toContain("3");
    expect(html).toContain("8/10");
    expect(html).toContain("4/5");
    expect(html).toContain("45.2");
    expect(html).toContain("68.5");
  });

  test("SSR renders status pills for items (response.text)", async ({ page }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS });

    const response = await page.goto("/");
    expect(response?.ok()).toBe(true);

    const html = await response!.text();

    // ── Status pills should render (ProgressPill uses conic-gradient) ──
    expect(html).toContain("conic-gradient");
  });

  test("SSR renders images/icons for items (response.text)", async ({ page }) => {
    await seedAndAuth(page, {
      groups: [
        {
          name: "Media",
          items: [
            {
              label: "Jellyfin",
              href: "https://jellyfin.test",
              iconUrl: "/icons/jellyfin.png",
            },
          ],
        },
      ],
    });

    const response = await page.goto("/");
    expect(response?.ok()).toBe(true);

    const html = await response!.text();

    // ── Item title visible ──
    expect(html).toContain("Jellyfin");

    // ── Image/icon visible ──
    expect(html).toContain("/icons/jellyfin.png");
    expect(html).toMatch(/<img[^>]*src=["'][^"']*jellyfin[^"']*["']/i);
  });

  test("SSR content is visible without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
    });
    const page = await context.newPage();

    // Seed via API first
    await page.request.post("/api/test/seed", {
      headers: { "x-test-secret": "e2e-test-reset-token" },
      data: {
        admin: { email: "admin@test.com", password: "password123" },
        groups: SEED_GROUPS,
      },
    });

    // Clear cookies so user is not authenticated (seed API sets session cookie)
    await context.clearCookies();

    await page.goto("/");

    // ── Dashboard title visible ──
    await expect(page.locator("h1").first()).toContainText("Labitat");

    // ── Multiple groups visible ──
    await expect(page.locator("h2")).toHaveText(["Infrastructure", "Media"]);

    // ── Multiple item-cards with titles visible ──
    await expect(page.getByText("Proxmox")).toBeVisible();
    await expect(page.getByText("Grafana")).toBeVisible();
    await expect(page.getByText("Jellyfin")).toBeVisible();

    // ── Palette picker button visible ──
    await expect(page.getByRole("button", { name: "Theme settings" })).toBeVisible();

    // ── Background picker button visible ──
    await expect(page.getByRole("button", { name: "Background settings" })).toBeVisible();

    // ── Sign-in button visible ──
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();

    // ── Links visible and clickable ──
    await expect(page.getByRole("link", { name: /Proxmox/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Proxmox/ })).toHaveAttribute(
      "href",
      "https://proxmox.test",
    );

    await context.close();
  });

  test("no hydration errors on initial load", async ({ page }) => {
    const hydrationErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        if (
          text.includes("hydration") ||
          text.includes("Hydration") ||
          text.includes("did not match")
        ) {
          hydrationErrors.push(text);
        }
      }
    });

    await seedAndAuth(page, { groups: SEED_GROUPS });
    await page.goto("/");

    // Wait for hydration to complete
    await page.waitForLoadState("domcontentloaded");
    // Small delay to catch any hydration errors
    await page.waitForTimeout(1000);

    expect(hydrationErrors).toEqual([]);
  });

  test("SSR and hydrated content match", async ({ browser }) => {
    // Seed first
    const seedContext = await browser.newContext();
    const seedPage = await seedContext.newPage();
    await seedPage.request.post("/api/test/seed", {
      headers: { "x-test-secret": "e2e-test-reset-token" },
      data: {
        admin: { email: "admin@test.com", password: "password123" },
        groups: SEED_GROUPS,
      },
    });
    await seedContext.close();

    // SSR-only
    const noJsContext = await browser.newContext({
      javaScriptEnabled: false,
    });
    const pageNoJs = await noJsContext.newPage();
    await pageNoJs.goto("/");

    const ssrGroups = await pageNoJs.locator("h2").allTextContents();
    const ssrItems = await pageNoJs.getByTestId("item-card").allTextContents();

    await noJsContext.close();

    // Normal browser (hydrated)
    const jsContext = await browser.newContext();
    const pageJs = await jsContext.newPage();

    // Capture console errors
    const consoleErrors: string[] = [];
    pageJs.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await pageJs.goto("/");
    // Wait for hydration to complete
    await pageJs.waitForTimeout(1000);

    // Check for hydration errors
    const hydrationErrors = consoleErrors.filter(
      (e) =>
        e.includes("hydration") ||
        e.includes("Hydration") ||
        e.includes("did not match") ||
        e.includes("Application error"),
    );

    // If there are hydration errors, the test should fail with a clear message
    if (hydrationErrors.length > 0) {
      throw new Error(`Hydration errors detected:\n${hydrationErrors.join("\n")}`);
    }

    const hydratedGroups = await pageJs.locator("h2").allTextContents();
    const hydratedItems = await pageJs.getByTestId("item-card").allTextContents();

    await jsContext.close();

    expect(ssrGroups).toEqual(hydratedGroups);
    expect(ssrItems).toEqual(hydratedItems);
  });
});
