import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { nginxProxyManagerDefinition, tokenCache } from "@/lib/adapters/nginx-proxy-manager";

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
      tokenCache.clear();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("fetches data successfully", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/tokens")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ token: "jwt-token", expires: 3600 }),
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
            json: () => Promise.resolve({ token: "jwt-token", expires: 3600 }),
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

    it("handles ISO date string expires format (real NPM format)", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/tokens")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                token: "jwt-token",
                expires: new Date(Date.now() + 3600 * 1000).toISOString(),
              }),
          });
        }
        if (url.includes("/proxy-hosts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1, enabled: true }]),
          });
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
