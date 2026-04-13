import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { prowlarrDefinition } from "@/lib/adapters/prowlarr";

describe("prowlarr definition", () => {
  it("has correct metadata", () => {
    expect(prowlarrDefinition.id).toBe("prowlarr");
    expect(prowlarrDefinition.name).toBe("Prowlarr");
    expect(prowlarrDefinition.icon).toBe("prowlarr");
    expect(prowlarrDefinition.category).toBe("downloads");
    expect(prowlarrDefinition.defaultPollingMs).toBe(15_000);
  });

  it("has configFields defined", () => {
    expect(prowlarrDefinition.configFields).toBeDefined();
    expect(prowlarrDefinition.configFields).toHaveLength(2);
    expect(prowlarrDefinition.configFields[0].key).toBe("url");
    expect(prowlarrDefinition.configFields[0].type).toBe("url");
    expect(prowlarrDefinition.configFields[0].required).toBe(true);
    expect(prowlarrDefinition.configFields[1].key).toBe("apiKey");
    expect(prowlarrDefinition.configFields[1].type).toBe("password");
    expect(prowlarrDefinition.configFields[1].required).toBe(true);
  });

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("fetches data successfully", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/indexerstats")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                indexers: [
                  { numberOfQueries: 100, numberOfGrabs: 30 },
                  { numberOfQueries: 50, numberOfGrabs: 12 },
                ],
              }),
          });
        }
        if (url.includes("/indexer")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }, { id: 2 }]),
          });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await prowlarrDefinition.fetchData!({
        url: "https://prowlarr.example.com/",
        apiKey: "test-key",
      });

      expect(result._status).toBe("ok");
      expect(result.queries).toBe(150);
      expect(result.grabs).toBe(42);
      expect(result.indexers).toBe(2);

      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }));

      await expect(
        prowlarrDefinition.fetchData!({
          url: "https://prowlarr.example.com",
          apiKey: "bad-key",
        }),
      ).rejects.toThrow("Prowlarr error: 500");
    });

    it("handles missing data with defaults", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/indexerstats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ indexers: [] }),
          });
        }
        // /indexer returns an array
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await prowlarrDefinition.fetchData!({
        url: "https://prowlarr.example.com",
        apiKey: "test-key",
      });

      expect(result.queries).toBe(0);
      expect(result.grabs).toBe(0);
      expect(result.indexers).toBe(0);
    });
  });

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = prowlarrDefinition.toPayload!({
        _status: "ok",
        queries: 150,
        grabs: 42,
        indexers: 10,
      });
      expect(payload.stats).toHaveLength(3);
      expect(payload.stats[0].value).toBe(150);
      expect(payload.stats[0].label).toBe("Queries");
      expect(payload.stats[1].value).toBe(42);
      expect(payload.stats[1].label).toBe("Grabs");
      expect(payload.stats[2].value).toBe(10);
      expect(payload.stats[2].label).toBe("Indexers");
    });

    it("handles zero values", () => {
      const payload = prowlarrDefinition.toPayload!({
        _status: "ok",
        queries: 0,
        grabs: 0,
        indexers: 0,
      });
      expect(payload.stats.every((s) => s.value === 0)).toBe(true);
    });
  });
});
