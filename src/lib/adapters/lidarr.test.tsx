import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { lidarrDefinition } from "@/lib/adapters/lidarr";

describe("lidarr definition", () => {
  it("has correct metadata", () => {
    expect(lidarrDefinition.id).toBe("lidarr");
    expect(lidarrDefinition.name).toBe("Lidarr");
    expect(lidarrDefinition.icon).toBe("lidarr");
    expect(lidarrDefinition.category).toBe("downloads");
    expect(lidarrDefinition.defaultPollingMs).toBe(10_000);
  });

  it("has configFields defined", () => {
    expect(lidarrDefinition.configFields).toBeDefined();
    expect(lidarrDefinition.configFields).toHaveLength(2);
    expect(lidarrDefinition.configFields[0].key).toBe("url");
    expect(lidarrDefinition.configFields[0].type).toBe("url");
    expect(lidarrDefinition.configFields[0].required).toBe(true);
    expect(lidarrDefinition.configFields[1].key).toBe("apiKey");
    expect(lidarrDefinition.configFields[1].type).toBe("password");
    expect(lidarrDefinition.configFields[1].required).toBe(true);
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
        if (url.includes("/artist")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }, { id: 2 }, { id: 3 }]),
          });
        }
        if (url.includes("/wanted/missing")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalRecords: 10 }),
          });
        }
        if (url.includes("/queue/status")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalCount: 5 }),
          });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await lidarrDefinition.fetchData!({
        url: "https://lidarr.example.com/",
        apiKey: "test-key",
      });

      expect(result._status).toBe("ok");
      expect(result.artists).toBe(3);
      expect(result.wanted).toBe(10);
      expect(result.queued).toBe(5);
    });

    it("throws on invalid API key", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }));

      await expect(
        lidarrDefinition.fetchData!({
          url: "https://lidarr.example.com",
          apiKey: "bad-key",
        }),
      ).rejects.toThrow("Invalid API key");
    });

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }));

      await expect(
        lidarrDefinition.fetchData!({
          url: "https://lidarr.example.com",
          apiKey: "test-key",
        }),
      ).rejects.toThrow("Lidarr not found at this URL");
    });

    it("handles missing optional endpoints gracefully", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/artist")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }]),
          });
        }
        if (url.includes("/wanted/missing") || url.includes("/queue/status")) {
          return Promise.resolve({ ok: false, status: 500 });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await lidarrDefinition.fetchData!({
        url: "https://lidarr.example.com",
        apiKey: "test-key",
      });

      expect(result.artists).toBe(1);
      expect(result.wanted).toBe(0);
      expect(result.queued).toBe(0);
    });
  });

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = lidarrDefinition.toPayload!({
        _status: "ok",
        queued: 5,
        wanted: 10,
        artists: 25,
      });
      expect(payload.stats).toHaveLength(3);
      expect(payload.stats[0].value).toBe("10");
      expect(payload.stats[0].label).toBe("Wanted");
      expect(payload.stats[1].value).toBe("5");
      expect(payload.stats[1].label).toBe("Queued");
      expect(payload.stats[2].value).toBe("25");
      expect(payload.stats[2].label).toBe("Artists");
    });

    it("handles zero values", () => {
      const payload = lidarrDefinition.toPayload!({
        _status: "ok",
        queued: 0,
        wanted: 0,
        artists: 0,
      });
      expect(payload.stats.every((s) => s.value === "0")).toBe(true);
    });
  });
});
