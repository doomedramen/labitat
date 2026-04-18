import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { plexDefinition } from "@/lib/adapters/plex";

describe("plex definition", () => {
  it("has correct metadata", () => {
    expect(plexDefinition.id).toBe("plex");
    expect(plexDefinition.name).toBe("Plex");
    expect(plexDefinition.icon).toBe("plex");
    expect(plexDefinition.category).toBe("media");
    expect(plexDefinition.defaultPollingMs).toBe(10_000);
  });

  it("has configFields defined", () => {
    expect(plexDefinition.configFields).toBeDefined();
    expect(plexDefinition.configFields).toHaveLength(3);
    expect(plexDefinition.configFields[0].key).toBe("url");
    expect(plexDefinition.configFields[0].type).toBe("url");
    expect(plexDefinition.configFields[0].required).toBe(true);
    expect(plexDefinition.configFields[1].key).toBe("token");
    expect(plexDefinition.configFields[1].type).toBe("password");
    expect(plexDefinition.configFields[1].required).toBe(true);
    expect(plexDefinition.configFields[2].key).toBe("showActiveStreams");
    expect(plexDefinition.configFields[2].type).toBe("boolean");
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
        if (url.includes("/status/sessions")) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                '<MediaContainer size="2"><Video title="Movie" grandparentTitle="" viewOffset="3600000" duration="7200000"><User title="user1" /><Player state="playing" /></Video></MediaContainer>',
              ),
          });
        }
        if (url.includes("/library/sections") && !url.includes("/all")) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                '<MediaContainer><Directory key="1" type="movie" /><Directory key="2" type="show" /></MediaContainer>',
              ),
          });
        }
        if (url.includes("/all")) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve('<MediaContainer totalSize="50"><Directory /></MediaContainer>'),
          });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await plexDefinition.fetchData!({
        url: "https://plex.example.com/",
        token: "test-token",
        showActiveStreams: "false",
      });

      expect(result._status).toBe("ok");
      expect(result.streams).toBe(2);
      expect(result.movies).toBe(50);
      expect(result.tvShows).toBe(50);
    });

    it("throws on invalid token", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }));

      await expect(
        plexDefinition.fetchData!({
          url: "https://plex.example.com",
          token: "bad-token",
        }),
      ).rejects.toThrow("Invalid Plex token");
    });

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }));

      await expect(
        plexDefinition.fetchData!({
          url: "https://plex.example.com",
          token: "test",
        }),
      ).rejects.toThrow("Plex not found at this URL");
    });

    it("decodes HTML entities in titles", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/status/sessions")) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                '<MediaContainer size="1"><Video title="Law &amp; Order: SVU" type="episode" grandparentTitle="Show Name" parentIndex="1" index="3" originalTitle="Law &amp; Order" viewOffset="1000" duration="2000"><User title="user&amp;test" /><Player state="playing" /></Video></MediaContainer>',
              ),
          });
        }
        if (url.includes("/library/sections") && !url.includes("/all")) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve("<MediaContainer />"),
          });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await plexDefinition.fetchData!({
        url: "https://plex.example.com",
        token: "test-token",
        showActiveStreams: "true",
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions![0].title).toBe("Law & Order: SVU");
      expect(result.sessions![0].subtitle).toBe("Show Name");
      expect(result.sessions![0].episode).toBe("S01E03");
      expect(result.sessions![0].user).toBe("user&test");
    });

    it("decodes numeric character references in titles", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/status/sessions")) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                '<MediaContainer size="1"><Video title="&#193;ndale" type="episode" grandparentTitle="Euphoria (US)" parentIndex="3" index="1" viewOffset="1000" duration="2000"><User title="TestUser" /><Player state="playing" /></Video></MediaContainer>',
              ),
          });
        }
        if (url.includes("/library/sections") && !url.includes("/all")) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve("<MediaContainer />"),
          });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await plexDefinition.fetchData!({
        url: "https://plex.example.com",
        token: "test-token",
        showActiveStreams: "true",
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions![0].title).toBe("Ándale");
      expect(result.sessions![0].subtitle).toBe("Euphoria (US)");
      expect(result.sessions![0].episode).toBe("S03E01");
    });

    it("formats TV episodes with SxxEyy", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/status/sessions")) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                '<MediaContainer size="1"><Video title="Episode Name" type="episode" grandparentTitle="Show Name" parentIndex="2" index="5" viewOffset="1000" duration="2000"><User title="TestUser" /><Player state="playing" /></Video></MediaContainer>',
              ),
          });
        }
        if (url.includes("/library/sections") && !url.includes("/all")) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve("<MediaContainer />"),
          });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await plexDefinition.fetchData!({
        url: "https://plex.example.com",
        token: "test-token",
        showActiveStreams: "true",
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions![0].title).toBe("Episode Name");
      expect(result.sessions![0].subtitle).toBe("Show Name");
      expect(result.sessions![0].episode).toBe("S02E05");
      expect(result.sessions![0].user).toBe("TestUser");
    });

    it("handles network errors", async () => {
      vi.stubGlobal("fetch", () => Promise.reject(new TypeError("Network request failed")));
      await expect(
        plexDefinition.fetchData!({ url: "https://example.com", token: "test" }),
      ).rejects.toThrow();
    });

    it("handles timeout errors", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.reject(new DOMException("The operation was aborted", "AbortError")),
      );
      await expect(
        plexDefinition.fetchData!({ url: "https://example.com", token: "test" }),
      ).rejects.toThrow();
    });

    it("handles malformed response body", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          text: () => Promise.reject(new SyntaxError("Unexpected token")),
        }),
      );
      await expect(
        plexDefinition.fetchData!({ url: "https://example.com", token: "test" }),
      ).rejects.toThrow();
    });

    it("handles empty library", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/status/sessions")) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<MediaContainer size="0" />'),
          });
        }
        if (url.includes("/library/sections")) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve("<MediaContainer />"),
          });
        }
        return Promise.reject(new Error("Unexpected URL"));
      });
      vi.stubGlobal("fetch", mockFetch);

      const result = await plexDefinition.fetchData!({
        url: "https://plex.example.com",
        token: "test-token",
      });

      expect(result.streams).toBe(0);
      expect(result.movies).toBe(0);
      expect(result.tvShows).toBe(0);
      expect(result.albums).toBe(0);
    });
  });

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = plexDefinition.toPayload!({
        _status: "ok",
        streams: 3,
        albums: 10,
        movies: 50,
        tvShows: 20,
        showActiveStreams: false,
      });
      expect(payload.stats).toHaveLength(4);
      expect(payload.stats[0].value).toBe(3);
      expect(payload.stats[0].label).toBe("Active");
      expect(payload.stats[1].value).toBe(10);
      expect(payload.stats[1].label).toBe("Albums");
      expect(payload.stats[2].value).toBe(50);
      expect(payload.stats[2].label).toBe("Movies");
      expect(payload.stats[3].value).toBe(20);
      expect(payload.stats[3].label).toBe("Shows");
    });

    it("includes streams when enabled", () => {
      const payload = plexDefinition.toPayload!({
        _status: "ok",
        streams: 1,
        albums: 0,
        movies: 0,
        tvShows: 0,
        showActiveStreams: true,
        sessions: [{ title: "Test", user: "User", progress: 60, duration: 120 }],
      });
      expect(payload.streams).toHaveLength(1);
    });

    it("excludes streams when disabled", () => {
      const payload = plexDefinition.toPayload!({
        _status: "ok",
        streams: 1,
        albums: 0,
        movies: 0,
        tvShows: 0,
        showActiveStreams: false,
        sessions: [{ title: "Test", user: "User", progress: 60, duration: 120 }],
      });
      expect(payload.streams).toBeUndefined();
    });
  });
});
