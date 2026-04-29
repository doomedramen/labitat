import { test as base, expect } from "@playwright/test";

const TEST_SECRET = "e2e-test-reset-token";

type Fixtures = {
  authenticatedPage: typeof base;
};

export const test = base.extend<Fixtures>({
  // Auto-reset DB before every test
  page: async ({ page }, use) => {
    await page.request.post("/api/test/reset-db", {
      headers: { "x-test-secret": TEST_SECRET },
    });
    /* eslint-disable-next-line react-hooks/rules-of-hooks -- Playwright fixture API, not React */
    await use(page);
  },
});

export { expect, TEST_SECRET };

/** Seed the database and authenticate via API (bypasses login form) */
export async function seedAndAuth(
  page: import("@playwright/test").Page,
  opts?: {
    admin?: { email: string; password: string };
    settings?: Record<string, string>;
    groups?: Array<{
      name: string;
      items?: Array<{
        label: string;
        href?: string;
        iconUrl?: string;
        serviceType?: string;
        serviceUrl?: string;
        cachedWidgetData?: Record<string, unknown>;
      }>;
    }>;
  },
) {
  const response = await page.request.post("/api/test/seed", {
    headers: { "x-test-secret": TEST_SECRET },
    data: {
      admin: opts?.admin ?? {
        email: "admin@test.com",
        password: "password123",
      },
      settings: opts?.settings,
      groups: opts?.groups,
    },
  });

  // Extract session cookie from response and add to browser context
  const setCookieHeaders = response
    .headersArray()
    .filter((h) => h.name.toLowerCase() === "set-cookie")
    .map((h) => h.value);
  if (setCookieHeaders.length > 0) {
    const parsedCookies = setCookieHeaders.map((cookieStr) => {
      const [nameValue, ...attrs] = cookieStr.split(";").map((s: string) => s.trim());
      const [name, value] = nameValue!.split("=");

      const cookie: any = {
        name: name!.trim(),
        value: value!.trim(),
        domain: "localhost",
        path: "/",
      };

      for (const attr of attrs) {
        const parts = attr.split("=");
        const key = parts[0]!.trim().toLowerCase();
        const val = parts[1]?.trim();

        if (key === "secure") cookie.secure = true;
        else if (key === "httponly") cookie.httpOnly = true;
        else if (key === "samesite") {
          if (val === "Strict" || val === "Lax" || val === "None") {
            cookie.sameSite = val;
          }
        } else if (key === "path") {
          cookie.path = val;
        } else if (key === "domain") {
          cookie.domain = val;
        } else if (key === "expires") {
          cookie.expires = Math.floor(new Date(val!).getTime() / 1000);
        }
      }

      return cookie;
    });

    await page.context().addCookies(parsedCookies);
  }
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
];
