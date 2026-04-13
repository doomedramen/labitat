import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { traefikDefinition } from "@/lib/adapters/traefik";

describe("traefik definition", () => {
  it("has correct metadata", () => {
    expect(traefikDefinition.id).toBe("traefik");
    expect(traefikDefinition.name).toBe("Traefik");
    expect(traefikDefinition.icon).toBe("traefik");
    expect(traefikDefinition.category).toBe("networking");
    expect(traefikDefinition.defaultPollingMs).toBe(15_000);
  });

  it("has configFields defined", () => {
    expect(traefikDefinition.configFields).toBeDefined();
    expect(traefikDefinition.configFields).toHaveLength(3);
    expect(traefikDefinition.configFields[0].key).toBe("url");
    expect(traefikDefinition.configFields[0].type).toBe("url");
    expect(traefikDefinition.configFields[0].required).toBe(true);
    expect(traefikDefinition.configFields[1].key).toBe("username");
    expect(traefikDefinition.configFields[1].type).toBe("text");
    expect(traefikDefinition.configFields[1].required).toBe(false);
    expect(traefikDefinition.configFields[2].key).toBe("password");
    expect(traefikDefinition.configFields[2].type).toBe("password");
    expect(traefikDefinition.configFields[2].required).toBe(false);
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
              http: {
                routers: { total: 10 },
                services: { total: 15 },
                middlewares: { total: 5 },
              },
            }),
        }),
      );

      const result = await traefikDefinition.fetchData!({
        url: "https://traefik.example.com/",
      });

      expect(result._status).toBe("ok");
      expect(result.routers).toBe(10);
      expect(result.services).toBe(15);
      expect(result.middlewares).toBe(5);
    });

    it("throws on invalid credentials", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }));

      await expect(
        traefikDefinition.fetchData!({
          url: "https://traefik.example.com",
          username: "admin",
          password: "wrong",
        }),
      ).rejects.toThrow("Invalid credentials");
    });

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }));

      await expect(
        traefikDefinition.fetchData!({
          url: "https://traefik.example.com",
        }),
      ).rejects.toThrow("Traefik not found at this URL");
    });

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      );

      const result = await traefikDefinition.fetchData!({
        url: "https://traefik.example.com",
      });

      expect(result.routers).toBe(0);
      expect(result.services).toBe(0);
      expect(result.middlewares).toBe(0);
    });

    it("uses Basic auth when credentials provided", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ http: {} }),
        }),
      );
      vi.stubGlobal("fetch", mockFetch);

      await traefikDefinition.fetchData!({
        url: "https://traefik.example.com",
        username: "admin",
        password: "secret",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://traefik.example.com/api/overview",
        expect.objectContaining({
          headers: {
            Authorization: `Basic ${Buffer.from("admin:secret").toString("base64")}`,
          },
        }),
      );
    });
  });

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = traefikDefinition.toPayload!({
        _status: "ok",
        routers: 10,
        services: 15,
        middlewares: 5,
      });
      expect(payload.stats).toHaveLength(3);
      expect(payload.stats[0].value).toBe("10");
      expect(payload.stats[0].label).toBe("Routers");
      expect(payload.stats[1].value).toBe("15");
      expect(payload.stats[1].label).toBe("Services");
      expect(payload.stats[2].value).toBe("5");
      expect(payload.stats[2].label).toBe("Middlewares");
    });

    it("handles zero values", () => {
      const payload = traefikDefinition.toPayload!({
        _status: "ok",
        routers: 0,
        services: 0,
        middlewares: 0,
      });
      expect(payload.stats.every((s) => s.value === "0")).toBe(true);
    });
  });
});
