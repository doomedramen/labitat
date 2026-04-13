import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { bazarrDefinition } from "@/lib/adapters/bazarr";

describe("bazarr definition", () => {
  it("has correct metadata", () => {
    expect(bazarrDefinition.id).toBe("bazarr");
    expect(bazarrDefinition.name).toBe("Bazarr");
    expect(bazarrDefinition.icon).toBe("bazarr");
    expect(bazarrDefinition.category).toBe("downloads");
    expect(bazarrDefinition.defaultPollingMs).toBe(15_000);
  });

  it("has configFields defined", () => {
    expect(bazarrDefinition.configFields).toBeDefined();
    expect(bazarrDefinition.configFields).toHaveLength(2);
    expect(bazarrDefinition.configFields[0].key).toBe("url");
    expect(bazarrDefinition.configFields[0].type).toBe("url");
    expect(bazarrDefinition.configFields[0].required).toBe(true);
    expect(bazarrDefinition.configFields[1].key).toBe("apiKey");
    expect(bazarrDefinition.configFields[1].type).toBe("password");
    expect(bazarrDefinition.configFields[1].required).toBe(true);
  });

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("fetches data successfully", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              movies: 339,
              episodes: 10111,
            }),
        }),
      );
      vi.stubGlobal("fetch", mockFetch);

      const result = await bazarrDefinition.fetchData!({
        url: "https://bazarr.example.com/",
        apiKey: "test-key",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://bazarr.example.com/api/badges",
        expect.objectContaining({ headers: { "X-Api-Key": "test-key" } }),
      );
      expect(result._status).toBe("ok");
      expect(result.missingMovies).toBe(339);
      expect(result.missingEpisodes).toBe(10111);
    });

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }));

      await expect(
        bazarrDefinition.fetchData!({
          url: "https://bazarr.example.com",
          apiKey: "bad-key",
        }),
      ).rejects.toThrow("Bazarr error: 500");
    });

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      );

      const result = await bazarrDefinition.fetchData!({
        url: "https://bazarr.example.com",
        apiKey: "test-key",
      });

      expect(result.missingMovies).toBe(0);
      expect(result.missingEpisodes).toBe(0);
    });
  });

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = bazarrDefinition.toPayload!({
        _status: "ok",
        missingMovies: 15,
        missingEpisodes: 42,
      });
      expect(payload.stats).toHaveLength(2);
      expect(payload.stats[0].value).toBe(15);
      expect(payload.stats[0].label).toBe("Missing Movies");
      expect(payload.stats[1].value).toBe(42);
      expect(payload.stats[1].label).toBe("Missing Episodes");
    });

    it("handles zero values", () => {
      const payload = bazarrDefinition.toPayload!({
        _status: "ok",
        missingMovies: 0,
        missingEpisodes: 0,
      });
      expect(payload.stats.every((s) => s.value === 0)).toBe(true);
    });
  });
});
