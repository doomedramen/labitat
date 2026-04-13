import { test, expect, seedAndAuth, SEED_GROUPS } from "../fixtures"

test.describe("SSR Rendering", () => {
  test("SSR HTML contains all groups and items (response.text)", async ({
    page,
  }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS })

    const response = await page.goto("/")
    expect(response?.ok()).toBe(true)

    const html = await response!.text()

    // Dashboard title
    expect(html).toContain("Labitat")

    // Groups
    expect(html).toContain("Infrastructure")
    expect(html).toContain("Media")

    // Items
    expect(html).toContain("Proxmox")
    expect(html).toContain("Grafana")
    expect(html).toContain("Jellyfin")

    // Links should be server-rendered
    expect(html).toContain('href="https://proxmox.test"')
    expect(html).toContain('href="https://grafana.test"')
    expect(html).toContain('href="https://jellyfin.test"')
  })

  test("SSR renders all required UI elements visible (response.text)", async ({
    page,
  }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS })

    const response = await page.goto("/")
    expect(response?.ok()).toBe(true)

    const html = await response!.text()

    // ── Dashboard title ──
    expect(html).toMatch(/<h1[^>]*>.*Labitat.*<\/h1>/i)

    // ── Multiple groups visible ──
    expect(html).toMatch(/<h2[^>]*>.*Infrastructure.*<\/h2>/i)
    expect(html).toMatch(/<h2[^>]*>.*Media.*<\/h2>/i)

    // ── Multiple item-cards with titles ──
    expect(html).toContain("Proxmox")
    expect(html).toContain("Grafana")
    expect(html).toContain("Jellyfin")

    // ── Palette picker button visible ──
    expect(html).toContain("Palette settings")
    expect(html).toMatch(/<svg[^>]*>.*<\/svg>.*Palette/i)

    // ── Background picker button visible ──
    expect(html).toContain("Background settings")

    // ── Sign-in button visible (not authenticated) ──
    expect(html).toMatch(/<button[^>]*>.*Sign in.*<\/button>/i)
    expect(html).toContain("Sign in")

    // ── Edit button should NOT be visible when not authenticated ──
    expect(html).not.toMatch(/<button[^>]*>.*Edit.*<\/button>/i)
  })

  test("SSR renders Edit button when authenticated (response.text)", async ({
    page,
  }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS })

    const response = await page.goto("/")
    expect(response?.ok()).toBe(true)

    const html = await response!.text()

    // ── Edit button visible when authenticated ──
    expect(html).toMatch(/<button[^>]*>.*Edit.*<\/button>/i)

    // ── Sign-in button should NOT be visible when authenticated ──
    expect(html).not.toContain("Sign in")
  })

  test("SSR renders stat cards with labels AND values (response.text)", async ({
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
                cpuUsage: 45.2,
                memoryUsage: 68.5,
                diskUsage: 52.1,
                uptime: "15d 4h 23m",
              },
            },
          ],
        },
      ],
    })

    const response = await page.goto("/")
    expect(response?.ok()).toBe(true)

    const html = await response!.text()

    // ── Stat card labels visible ──
    expect(html).toContain("CPU")
    expect(html).toContain("Memory")
    expect(html).toContain("Disk")

    // ── Stat card values visible ──
    expect(html).toContain("45")
    expect(html).toContain("68")
    expect(html).toContain("52")
  })

  test("SSR renders status dots for items (response.text)", async ({
    page,
  }) => {
    await seedAndAuth(page, { groups: SEED_GROUPS })

    const response = await page.goto("/")
    expect(response?.ok()).toBe(true)

    const html = await response!.text()

    // ── Status dots should render (role="status" from StatusDot component) ──
    expect(html).toMatch(/role=["']status["']/i)
    expect(html).toContain("Status unknown")
  })

  test("SSR renders images/icons for items (response.text)", async ({
    page,
  }) => {
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
    })

    const response = await page.goto("/")
    expect(response?.ok()).toBe(true)

    const html = await response!.text()

    // ── Item title visible ──
    expect(html).toContain("Jellyfin")

    // ── Image/icon visible ──
    expect(html).toContain("/icons/jellyfin.png")
    expect(html).toMatch(/<img[^>]*src=["'][^"']*jellyfin[^"']*["']/i)
  })

  test("SSR content is visible without JavaScript", async ({ browser }) => {
    const context = await browser.newContext({
      javaScriptEnabled: false,
    })
    const page = await context.newPage()

    // Seed via API first
    await page.request.post("/api/test/seed", {
      headers: { "x-test-secret": "e2e-test-reset-token" },
      data: {
        admin: { email: "admin@test.com", password: "password123" },
        groups: SEED_GROUPS,
      },
    })

    await page.goto("/")

    // ── Dashboard title visible ──
    await expect(page.locator("h1")).toContainText("Labitat")

    // ── Multiple groups visible ──
    await expect(page.locator("h2")).toHaveText(["Infrastructure", "Media"])

    // ── Multiple item-cards with titles visible ──
    await expect(page.getByText("Proxmox")).toBeVisible()
    await expect(page.getByText("Grafana")).toBeVisible()
    await expect(page.getByText("Jellyfin")).toBeVisible()

    // ── Palette picker button visible ──
    await expect(
      page.getByRole("button", { name: "Theme settings" })
    ).toBeVisible()

    // ── Background picker button visible ──
    await expect(
      page.getByRole("button", { name: "Background settings" })
    ).toBeVisible()

    // ── Sign-in button visible ──
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible()

    // ── Links visible and clickable ──
    await expect(page.getByRole("link", { name: /Proxmox/ })).toBeVisible()
    await expect(page.getByRole("link", { name: /Proxmox/ })).toHaveAttribute(
      "href",
      "https://proxmox.test"
    )

    await context.close()
  })

  test("no hydration errors on initial load", async ({ page }) => {
    const hydrationErrors: string[] = []

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text()
        if (
          text.includes("hydration") ||
          text.includes("Hydration") ||
          text.includes("did not match")
        ) {
          hydrationErrors.push(text)
        }
      }
    })

    await seedAndAuth(page, { groups: SEED_GROUPS })
    await page.goto("/")

    // Wait for hydration to complete
    await page.waitForLoadState("domcontentloaded")
    // Small delay to catch any hydration errors
    await page.waitForTimeout(1000)

    expect(hydrationErrors).toEqual([])
  })

  test("SSR and hydrated content match", async ({ browser }) => {
    // Seed first
    const seedContext = await browser.newContext()
    const seedPage = await seedContext.newPage()
    await seedPage.request.post("/api/test/seed", {
      headers: { "x-test-secret": "e2e-test-reset-token" },
      data: {
        admin: { email: "admin@test.com", password: "password123" },
        groups: SEED_GROUPS,
      },
    })
    await seedContext.close()

    // SSR-only
    const noJsContext = await browser.newContext({
      javaScriptEnabled: false,
    })
    const pageNoJs = await noJsContext.newPage()
    await pageNoJs.goto("/")

    const ssrGroups = await pageNoJs.locator("h2").allTextContents()
    const ssrItems = await pageNoJs.getByTestId("item-card").allTextContents()

    await noJsContext.close()

    // Normal browser (hydrated)
    const jsContext = await browser.newContext()
    const pageJs = await jsContext.newPage()
    await pageJs.goto("/")
    await pageJs.waitForLoadState("domcontentloaded")
    await pageJs.waitForTimeout(1000)

    const hydratedGroups = await pageJs.locator("h2").allTextContents()
    const hydratedItems = await pageJs
      .getByTestId("item-card")
      .allTextContents()

    await jsContext.close()

    expect(ssrGroups).toEqual(hydratedGroups)
    expect(ssrItems).toEqual(hydratedItems)
  })
})
