import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { immichDefinition } from "@/lib/adapters/immich";

describe("immich definition", () => {
  it("has correct metadata", () => {
    expect(immichDefinition.id).toBe("immich");
    expect(immichDefinition.name).toBe("Immich");
    expect(immichDefinition.icon).toBe("immich");
    expect(immichDefinition.category).toBe("media");
    expect(immichDefinition.defaultPollingMs).toBe(60_000);
  });

  it("has configFields defined", () => {
    expect(immichDefinition.configFields).toBeDefined();
    expect(immichDefinition.configFields).toHaveLength(3);
    expect(immichDefinition.configFields[0].key).toBe("url");
    expect(immichDefinition.configFields[0].type).toBe("url");
    expect(immichDefinition.configFields[0].required).toBe(true);
    expect(immichDefinition.configFields[1].key).toBe("apiKey");
    expect(immichDefinition.configFields[1].type).toBe("password");
    expect(immichDefinition.configFields[1].required).toBe(true);
    expect(immichDefinition.configFields[2].key).toBe("version");
    expect(immichDefinition.configFields[2].type).toBe("select");
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
        if (url.includes("/version")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ major: 1, minor: 90 }),
          });
        }
        if (url.includes("/statistics") || url.includes("/stats")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                photos: 5000,
                videos: 500,
                usage: 50000000000,
                usageByUser: [{}, {}, {}],
              }),
          });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await immichDefinition.fetchData!({
        url: "https://immich.example.com/",
        apiKey: "test-key",
        version: "1",
      });

      expect(result._status).toBe("ok");
      expect(result.photos).toBe(5000);
      expect(result.videos).toBe(500);
      expect(result.users).toBe(3);
      expect(result.storage).toBe(50000000000);
    });

    it("throws on invalid API key", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }));

      await expect(
        immichDefinition.fetchData!({
          url: "https://immich.example.com",
          apiKey: "bad-key",
        }),
      ).rejects.toThrow("Invalid API key");
    });

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }));

      await expect(
        immichDefinition.fetchData!({
          url: "https://immich.example.com",
          apiKey: "test-key",
        }),
      ).rejects.toThrow("Immich not found at this URL");
    });

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      );

      const result = await immichDefinition.fetchData!({
        url: "https://immich.example.com",
        apiKey: "test-key",
      });

      expect(result.photos).toBe(0);
      expect(result.videos).toBe(0);
      expect(result.users).toBe(0);
      expect(result.storage).toBe(0);
    });

    it("rejects on network error", async () => {
      vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Network request failed")));

      await expect(
        immichDefinition.fetchData!({
          url: "https://immich.example.com",
          apiKey: "test-key",
        }),
      ).rejects.toThrow("Network request failed");
    });

    it("rejects on timeout (abort)", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.reject(new DOMException("The operation was aborted", "AbortError")),
      );

      await expect(
        immichDefinition.fetchData!({
          url: "https://immich.example.com",
          apiKey: "test-key",
        }),
      ).rejects.toThrow("The operation was aborted");
    });

    it("rejects on malformed JSON", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.reject(new SyntaxError("Unexpected token")),
        }),
      );

      await expect(
        immichDefinition.fetchData!({
          url: "https://immich.example.com",
          apiKey: "test-key",
        }),
      ).rejects.toThrow("Unexpected token");
    });
  });

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = immichDefinition.toPayload!({
        _status: "ok",
        users: 3,
        photos: 5000,
        videos: 500,
        storage: 50000000000,
      });
      expect(payload.stats).toHaveLength(4);
      expect(payload.stats[0].value).toBe(3);
      expect(payload.stats[0].label).toBe("Users");
      expect(payload.stats[1].value).toBe(5000);
      expect(payload.stats[1].label).toBe("Photos");
      expect(payload.stats[2].value).toBe(500);
      expect(payload.stats[2].label).toBe("Videos");
      expect(payload.stats[3].value).toBe("50.0 GB");
      expect(payload.stats[3].label).toBe("Storage");
    });

    it("handles zero values", () => {
      const payload = immichDefinition.toPayload!({
        _status: "ok",
        users: 0,
        photos: 0,
        videos: 0,
        storage: 0,
      });
      expect(payload.stats[0].value).toBe(0);
      expect(payload.stats[1].value).toBe(0);
      expect(payload.stats[2].value).toBe(0);
      expect(payload.stats[3].value).toBe("0 KB");
    });
  });
});
