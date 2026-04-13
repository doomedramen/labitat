import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { adguardDefinition } from "@/lib/adapters/adguard";

describe("adguard definition", () => {
  it("has correct metadata", () => {
    expect(adguardDefinition.id).toBe("adguard");
    expect(adguardDefinition.name).toBe("AdGuard Home");
    expect(adguardDefinition.icon).toBe("adguard-home");
    expect(adguardDefinition.category).toBe("networking");
    expect(adguardDefinition.defaultPollingMs).toBe(15_000);
  });

  it("has configFields defined", () => {
    expect(adguardDefinition.configFields).toBeDefined();
    expect(adguardDefinition.configFields).toHaveLength(3);
    expect(adguardDefinition.configFields[0].key).toBe("url");
    expect(adguardDefinition.configFields[0].type).toBe("url");
    expect(adguardDefinition.configFields[0].required).toBe(true);
    expect(adguardDefinition.configFields[1].key).toBe("username");
    expect(adguardDefinition.configFields[1].type).toBe("text");
    expect(adguardDefinition.configFields[1].required).toBe(true);
    expect(adguardDefinition.configFields[2].key).toBe("password");
    expect(adguardDefinition.configFields[2].type).toBe("password");
    expect(adguardDefinition.configFields[2].required).toBe(true);
  });

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("fetches data successfully", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              num_dns_queries: 10000,
              num_blocked_filtering: 2500,
              num_blocked_parental: 100,
              num_blocked_safe_search: 50,
            }),
        }),
      );

      const result = await adguardDefinition.fetchData!({
        url: "https://adguard.example.com/",
        username: "admin",
        password: "secret",
      });

      expect(result._status).toBe("ok");
      expect(result.queries).toBe(10000);
      expect(result.blocked).toBe(2500);
      expect(result.blockedPercent).toBe(25);
      expect(result.parentalBlocked).toBe(100);
      expect(result.safeSearchBlocked).toBe(50);
    });

    it("calculates blocked percent correctly", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              num_dns_queries: 200,
              num_blocked_filtering: 50,
            }),
        }),
      );

      const result = await adguardDefinition.fetchData!({
        url: "https://adguard.example.com",
        username: "admin",
        password: "secret",
      });

      expect(result.blockedPercent).toBe(25);
    });

    it("handles zero queries gracefully", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              num_dns_queries: 0,
              num_blocked_filtering: 0,
            }),
        }),
      );

      const result = await adguardDefinition.fetchData!({
        url: "https://adguard.example.com",
        username: "admin",
        password: "secret",
      });

      expect(result.blockedPercent).toBe(0);
    });

    it("handles malformed JSON response", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new SyntaxError("Unexpected token")),
        }),
      );
      await expect(
        adguardDefinition.fetchData!({
          url: "https://example.com",
          username: "admin",
          password: "secret",
        }),
      ).rejects.toThrow();
    });

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }));

      await expect(
        adguardDefinition.fetchData!({
          url: "https://adguard.example.com",
          username: "admin",
          password: "wrong",
        }),
      ).rejects.toThrow("AdGuard error: 401");
    });

    it("uses Basic auth header", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              num_dns_queries: 100,
              num_blocked_filtering: 30,
            }),
        }),
      );
      vi.stubGlobal("fetch", mockFetch);

      await adguardDefinition.fetchData!({
        url: "https://adguard.example.com",
        username: "admin",
        password: "secret",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://adguard.example.com/control/stats",
        expect.objectContaining({
          headers: {
            Authorization: `Basic ${btoa("admin:secret")}`,
          },
        }),
      );
    });
  });

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = adguardDefinition.toPayload!({
        _status: "ok",
        queries: 10000,
        blocked: 2500,
        blockedPercent: 25,
        parentalBlocked: 100,
        safeSearchBlocked: 50,
        latency: 45,
      });
      expect(payload.stats).toHaveLength(6);
      expect(payload.stats[0].value).toBe("10,000");
      expect(payload.stats[0].label).toBe("Queries");
      expect(payload.stats[1].value).toBe("2,500");
      expect(payload.stats[1].label).toBe("Blocked");
      expect(payload.stats[2].value).toBe("25.0%");
      expect(payload.stats[2].label).toBe("Rate");
      expect(payload.stats[3].value).toBe("100");
      expect(payload.stats[3].label).toBe("Parental");
      expect(payload.stats[4].value).toBe("50");
      expect(payload.stats[4].label).toBe("Safe");
      expect(payload.stats[5].value).toBe("45ms");
      expect(payload.stats[5].label).toBe("Latency");
    });
  });
});
