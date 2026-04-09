import { test as base, expect } from "@playwright/test"

const TEST_SECRET = "e2e-test-reset-token"

type Fixtures = {
  authenticatedPage: typeof base
}

export const test = base.extend<Fixtures>({
  // Auto-reset DB before every test
  page: async ({ page }, use) => {
    await page.request.post("/api/test/reset-db", {
      headers: { "x-test-secret": TEST_SECRET },
    })
    /* eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture API, not React */
    await use(page)
  },
})

export { expect, TEST_SECRET }

/** Seed the database and authenticate via API (bypasses login form) */
export async function seedAndAuth(
  page: import("@playwright/test").Page,
  opts?: {
    admin?: { email: string; password: string }
    settings?: Record<string, string>
    groups?: Array<{
      name: string
      items?: Array<{
        label: string
        href?: string
        iconUrl?: string
        serviceType?: string
        serviceUrl?: string
      }>
    }>
  }
) {
  await page.request.post("/api/test/seed", {
    headers: { "x-test-secret": TEST_SECRET },
    data: {
      admin: opts?.admin ?? {
        email: "admin@test.com",
        password: "password123",
      },
      settings: opts?.settings,
      groups: opts?.groups,
    },
  })
}

/** Default seeded groups for dashboard tests */
export const SEED_GROUPS = [
  {
    name: "Infrastructure",
    items: [
      { label: "Proxmox", href: "https://proxmox.test" },
      { label: "Grafana", href: "https://grafana.test" },
    ],
  },
  {
    name: "Media",
    items: [{ label: "Jellyfin", href: "https://jellyfin.test" }],
  },
]
