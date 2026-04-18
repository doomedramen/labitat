import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { sonarrDefinition } from "@/lib/adapters/sonarr";

describe("sonarr definition", () => {
  it("has correct metadata", () => {
    expect(sonarrDefinition.id).toBe("sonarr");
    expect(sonarrDefinition.name).toBe("Sonarr");
    expect(sonarrDefinition.icon).toBe("sonarr");
    expect(sonarrDefinition.category).toBe("downloads");
    expect(sonarrDefinition.defaultPollingMs).toBe(10_000);
  });

  it("has configFields defined", () => {
    expect(sonarrDefinition.configFields).toBeDefined();
    expect(sonarrDefinition.configFields).toHaveLength(4);
    expect(sonarrDefinition.configFields[0].key).toBe("url");
    expect(sonarrDefinition.configFields[0].type).toBe("url");
    expect(sonarrDefinition.configFields[0].required).toBe(true);
    expect(sonarrDefinition.configFields[1].key).toBe("apiKey");
    expect(sonarrDefinition.configFields[1].type).toBe("password");
    expect(sonarrDefinition.configFields[1].required).toBe(true);
    expect(sonarrDefinition.configFields[2].key).toBe("showActiveDownloads");
    expect(sonarrDefinition.configFields[2].type).toBe("boolean");
    expect(sonarrDefinition.configFields[3].key).toBe("enableQueue");
    expect(sonarrDefinition.configFields[3].type).toBe("boolean");
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
        if (url.includes("/queue")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                totalRecords: 3,
                records: [],
              }),
          });
        }
        if (url.includes("/series")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }, { id: 2 }, { id: 3 }]),
          });
        }
        if (url.includes("/wanted/missing")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalRecords: 7 }),
          });
        }
        if (url.includes("/wanted/cutoff")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalRecords: 12 }),
          });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await sonarrDefinition.fetchData!({
        url: "https://sonarr.example.com/",
        apiKey: "test-key",
      });

      expect(result._status).toBe("ok");
      expect(result.queued).toBe(3);
      expect(result.missing).toBe(7);
      expect(result.wanted).toBe(12);
      expect(result.series).toBe(3);
      expect(result.downloads).toEqual([]);

      expect(mockFetch).toHaveBeenCalledTimes(4);
      expect(mockFetch).toHaveBeenCalledWith(
        "https://sonarr.example.com/api/v3/queue?pageSize=50&includeSeries=true",
        expect.objectContaining({ headers: { "X-Api-Key": "test-key" } }),
      );
    });

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }));

      await expect(
        sonarrDefinition.fetchData!({
          url: "https://sonarr.example.com",
          apiKey: "bad-key",
        }),
      ).rejects.toThrow("Sonarr error: 401");
    });

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      );

      const result = await sonarrDefinition.fetchData!({
        url: "https://sonarr.example.com",
        apiKey: "test-key",
      });

      expect(result.queued).toBe(0);
      expect(result.missing).toBe(0);
      expect(result.wanted).toBe(0);
      expect(result.series).toBe(0);
      expect(result.downloads).toEqual([]);
    });

    it("fetches active downloads when enabled", async () => {
      const futureTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/queue")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                totalRecords: 1,
                records: [
                  {
                    title: "S01E01 Test Episode",
                    seasonNumber: 1,
                    episodeNumber: 1,
                    size: 1073741824,
                    sizeleft: 536870912,
                    trackedDownloadState: "downloading",
                    estimatedCompletionTime: futureTime,
                    series: { title: "Test Series" },
                  },
                ],
              }),
          });
        }
        if (url.includes("/series")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }]),
          });
        }
        if (url.includes("/wanted/missing")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalRecords: 0 }),
          });
        }
        if (url.includes("/wanted/cutoff")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalRecords: 0 }),
          });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await sonarrDefinition.fetchData!({
        url: "https://sonarr.example.com",
        apiKey: "test-key",
        showActiveDownloads: "true",
      });

      expect(result.downloads).toHaveLength(1);
      expect(result.downloads![0].title).toBe("S01E01 - Test Episode");
      expect(result.downloads![0].subtitle).toBe("Test Series");
      expect(result.downloads![0].progress).toBe(50);
      expect(result.downloads![0].activity).toBe("Downloading");
      expect(result.downloads![0].size).toBe("1.0 GB");
    });

    it("shows importing state correctly", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/queue")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                totalRecords: 1,
                records: [
                  {
                    title: "S01E02 Another Episode",
                    seasonNumber: 1,
                    episodeNumber: 2,
                    size: 2147483648,
                    sizeleft: 0,
                    trackedDownloadState: "importing",
                    series: { title: "Another Series" },
                  },
                ],
              }),
          });
        }
        if (url.includes("/series")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }]),
          });
        }
        if (url.includes("/wanted/missing")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalRecords: 0 }),
          });
        }
        if (url.includes("/wanted/cutoff")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalRecords: 0 }),
          });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await sonarrDefinition.fetchData!({
        url: "https://sonarr.example.com",
        apiKey: "test-key",
        showActiveDownloads: "true",
      });

      expect(result.downloads![0].activity).toBe("Importing");
      expect(result.downloads![0].progress).toBe(100);
    });

    it("strips trailing slash from URL", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        }),
      );
      vi.stubGlobal("fetch", mockFetch);

      await sonarrDefinition.fetchData!({
        url: "https://sonarr.example.com/",
        apiKey: "test-key",
      });

      const calls = mockFetch.mock.calls as unknown as [string, ...unknown[]][];
      for (const call of calls) {
        expect(call[0]).not.toMatch(/\/\/api/);
      }
    });

    it("rejects on network error", async () => {
      vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Network request failed")));

      await expect(
        sonarrDefinition.fetchData!({
          url: "https://sonarr.example.com",
          apiKey: "test-key",
        }),
      ).rejects.toThrow("Network request failed");
    });

    it("rejects on timeout (abort error)", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.reject(new DOMException("The operation was aborted", "AbortError")),
      );

      await expect(
        sonarrDefinition.fetchData!({
          url: "https://sonarr.example.com",
          apiKey: "test-key",
        }),
      ).rejects.toThrow("The operation was aborted");
    });

    it("rejects on malformed JSON response", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.reject(new SyntaxError("Unexpected token")),
        }),
      );

      await expect(
        sonarrDefinition.fetchData!({
          url: "https://sonarr.example.com",
          apiKey: "test-key",
        }),
      ).rejects.toThrow("Unexpected token");
    });
  });

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = sonarrDefinition.toPayload!({
        _status: "ok",
        queued: 3,
        missing: 7,
        wanted: 10,
        series: 25,
      });
      expect(payload.stats).toHaveLength(4);
      expect(payload.stats[0].value).toBe(3);
      expect(payload.stats[0].label).toBe("Queued");
      expect(payload.stats[1].value).toBe(7);
      expect(payload.stats[1].label).toBe("Missing");
      expect(payload.stats[2].value).toBe(10);
      expect(payload.stats[2].label).toBe("Wanted");
      expect(payload.stats[3].value).toBe(25);
      expect(payload.stats[3].label).toBe("Series");
    });

    it("includes downloads when enabled", () => {
      const payload = sonarrDefinition.toPayload!({
        _status: "ok",
        queued: 1,
        missing: 0,
        wanted: 0,
        series: 1,
        showActiveDownloads: true,
        enableQueue: true,
        downloads: [{ title: "Test", progress: 50 }],
      });
      expect(payload.downloads).toHaveLength(1);
      expect(payload.downloads![0].title).toBe("Test");
    });

    it("excludes downloads when disabled", () => {
      const payload = sonarrDefinition.toPayload!({
        _status: "ok",
        queued: 1,
        missing: 0,
        wanted: 0,
        series: 1,
        showActiveDownloads: false,
        enableQueue: true,
        downloads: [{ title: "Test", progress: 50 }],
      });
      expect(payload.downloads).toBeUndefined();
    });

    it("excludes downloads when queue disabled", () => {
      const payload = sonarrDefinition.toPayload!({
        _status: "ok",
        queued: 1,
        missing: 0,
        wanted: 0,
        series: 1,
        showActiveDownloads: true,
        enableQueue: false,
        downloads: [{ title: "Test", progress: 50 }],
      });
      expect(payload.downloads).toBeUndefined();
    });

    it("handles zero values", () => {
      const payload = sonarrDefinition.toPayload!({
        _status: "ok",
        queued: 0,
        missing: 0,
        wanted: 0,
        series: 0,
      });
      expect(payload.stats.every((s) => s.value === 0)).toBe(true);
    });
  });
});
