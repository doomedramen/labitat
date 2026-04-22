import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nginxProxyManagerDefinition, cookieCache } from "@/lib/adapters/nginx-proxy-manager";

describe("nginx-proxy-manager definition", () => {
  it("has correct metadata", () => {
    expect(nginxProxyManagerDefinition.id).toBe("nginx-proxy-manager");
    expect(nginxProxyManagerDefinition.name).toBe("Nginx Proxy Manager");
    expect(nginxProxyManagerDefinition.icon).toBe("nginx-proxy-manager");
    expect(nginxProxyManagerDefinition.category).toBe("networking");
    expect(nginxProxyManagerDefinition.defaultPollingMs).toBe(15_000);
  });

  it("has configFields defined", () => {
    expect(nginxProxyManagerDefinition.configFields).toBeDefined();
    expect(nginxProxyManagerDefinition.configFields).toHaveLength(4);
    expect(nginxProxyManagerDefinition.configFields[0].key).toBe("url");
    expect(nginxProxyManagerDefinition.configFields[0].type).toBe("url");
    expect(nginxProxyManagerDefinition.configFields[0].required).toBe(true);
    expect(nginxProxyManagerDefinition.configFields[1].key).toBe("email");
    expect(nginxProxyManagerDefinition.configFields[1].type).toBe("text");
    expect(nginxProxyManagerDefinition.configFields[1].required).toBe(true);
    expect(nginxProxyManagerDefinition.configFields[2].key).toBe("password");
    expect(nginxProxyManagerDefinition.configFields[2].type).toBe("password");
    expect(nginxProxyManagerDefinition.configFields[2].required).toBe(true);
    expect(nginxProxyManagerDefinition.configFields[3].key).toBe("insecure");
    expect(nginxProxyManagerDefinition.configFields[3].type).toBe("boolean");
  });

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks();
      cookieCache.clear();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("fetches data successfully using cookie auth", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/tokens")) {
          return Promise.resolve({
            ok: true,
            headers: {
              get: (name: string) => {
                if (name.toLowerCase() === "set-cookie") {
                  return "token=s%3Ajwt-token-value; Path=/api; Expires=Thu, 23 Apr 2026 13:57:35 GMT; HttpOnly; Secure; SameSite=Strict";
                }
                return null;
              },
            },
            json: () => Promise.resolve({ expires: "2026-04-23T13:57:35.000Z" }),
          });
        }
        if (url.includes("/proxy-hosts")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                { id: 1, enabled: true },
                { id: 2, enabled: false },
                { id: 3, enabled: 1 },
                { id: 4, enabled: 0 },
                { id: 5, enabled: true },
              ]),
          });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await nginxProxyManagerDefinition.fetchData!({
        url: "https://npm.example.com/",
        email: "admin@example.org",
        password: "secret",
      });

      expect(result._status).toBe("ok");
      expect(result.hosts).toHaveLength(5);

      // Verify cookie was used in the proxy-hosts request
      const proxyHostsCall = mockFetch.mock.calls.find((call) =>
        call[0].includes("/proxy-hosts"),
      ) as unknown as [string, { headers: { Cookie: string } }];
      expect(proxyHostsCall).toBeDefined();
      expect(proxyHostsCall[1].headers.Cookie).toBe("token=s:jwt-token-value");
    });

    it("throws on login failure", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: false,
          status: 401,
          text: () => Promise.resolve("Unauthorized"),
          json: () => Promise.resolve({ error: "Unauthorized" }),
        }),
      );

      await expect(
        nginxProxyManagerDefinition.fetchData!({
          url: "https://npm.example.com",
          email: "admin@example.org",
          password: "wrong",
        }),
      ).rejects.toThrow("NPM login failed (401): Unauthorized");
    });

    it("handles failed endpoint gracefully", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/tokens")) {
          return Promise.resolve({
            ok: true,
            headers: {
              get: (name: string) => {
                if (name.toLowerCase() === "set-cookie") {
                  return "token=s%3Ajwt-token; Path=/api; Expires=Thu, 23 Apr 2026 13:57:35 GMT";
                }
                return null;
              },
            },
            json: () => Promise.resolve({ expires: "2026-04-23T13:57:35.000Z" }),
          });
        }
        if (url.includes("/proxy-hosts")) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await nginxProxyManagerDefinition.fetchData!({
        url: "https://npm.example.com",
        email: "admin@example.org",
        password: "secret",
      });

      expect(result._status).toBe("ok");
      expect(result.hosts).toHaveLength(0);
    });

    it("throws specific error for 2FA challenge response", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          headers: { get: () => null },
          json: () =>
            Promise.resolve({
              requires_2fa: true,
              challenge_token: "challenge-123",
            }),
        }),
      );

      await expect(
        nginxProxyManagerDefinition.fetchData!({
          url: "https://npm.example.com",
          email: "admin@example.org",
          password: "secret",
        }),
      ).rejects.toThrow("Two-factor authentication (2FA) is required");
    });

    it("throws error when no token cookie in response", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          headers: { get: () => null },
          json: () => Promise.resolve({ expires: "2026-04-23T13:43:07.464Z" }),
        }),
      );

      await expect(
        nginxProxyManagerDefinition.fetchData!({
          url: "https://npm.example.com",
          email: "admin@example.org",
          password: "secret",
        }),
      ).rejects.toThrow("no token cookie in response");
    });

    it("retries after 403 by re-authenticating", async () => {
      let hostsCallCount = 0;
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/tokens")) {
          return Promise.resolve({
            ok: true,
            headers: {
              get: (name: string) => {
                if (name.toLowerCase() === "set-cookie") {
                  return "token=s%3Anew-token; Path=/api; Expires=Thu, 23 Apr 2026 13:57:35 GMT";
                }
                return null;
              },
            },
            json: () => Promise.resolve({ expires: "2026-04-23T13:57:35.000Z" }),
          });
        }
        if (url.includes("/proxy-hosts")) {
          hostsCallCount++;
          // First call returns 403, second succeeds
          if (hostsCallCount === 2) {
            return Promise.resolve({
              ok: true,
              json: () => Promise.resolve([{ id: 1, enabled: true }]),
            });
          }
          return Promise.resolve({ ok: false, status: 403 });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await nginxProxyManagerDefinition.fetchData!({
        url: "https://npm.example.com",
        email: "admin@example.org",
        password: "secret",
      });

      expect(result._status).toBe("ok");
      expect(result.hosts).toHaveLength(1);
      expect(mockFetch).toHaveBeenCalledTimes(4); // token, 403, token (retry), success
    });
  });

  describe("toPayload", () => {
    it("converts data to payload with enabled/disabled/total", () => {
      const payload = nginxProxyManagerDefinition.toPayload!({
        _status: "ok",
        hosts: [
          { id: 1, enabled: true },
          { id: 2, enabled: false },
          { id: 3, enabled: 1 },
          { id: 4, enabled: 0 },
          { id: 5, enabled: true },
        ],
      });

      expect(payload.stats).toHaveLength(3);
      expect(payload.stats[0].value).toBe(3);
      expect(payload.stats[0].label).toBe("Enabled");
      expect(payload.stats[1].value).toBe(2);
      expect(payload.stats[1].label).toBe("Disabled");
      expect(payload.stats[2].value).toBe(5);
      expect(payload.stats[2].label).toBe("Total");
    });

    it("handles empty hosts array", () => {
      const payload = nginxProxyManagerDefinition.toPayload!({
        _status: "ok",
        hosts: [],
      });

      expect(payload.stats[0].value).toBe(0);
      expect(payload.stats[1].value).toBe(0);
      expect(payload.stats[2].value).toBe(0);
    });

    it("handles undefined hosts", () => {
      const payload = nginxProxyManagerDefinition.toPayload!({
        _status: "ok",
      });

      expect(payload.stats[0].value).toBe(0);
      expect(payload.stats[1].value).toBe(0);
      expect(payload.stats[2].value).toBe(0);
    });
  });
});
