import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { tautulliDefinition } from "@/lib/adapters/tautulli";

describe("tautulli definition", () => {
  it("has correct metadata", () => {
    expect(tautulliDefinition.id).toBe("tautulli");
    expect(tautulliDefinition.name).toBe("Tautulli");
    expect(tautulliDefinition.icon).toBe("tautulli");
    expect(tautulliDefinition.category).toBe("media");
    expect(tautulliDefinition.defaultPollingMs).toBe(10_000);
  });

  it("has configFields defined", () => {
    expect(tautulliDefinition.configFields).toBeDefined();
    expect(tautulliDefinition.configFields).toHaveLength(2);
    expect(tautulliDefinition.configFields[0].key).toBe("url");
    expect(tautulliDefinition.configFields[0].type).toBe("url");
    expect(tautulliDefinition.configFields[0].required).toBe(true);
    expect(tautulliDefinition.configFields[1].key).toBe("apiKey");
    expect(tautulliDefinition.configFields[1].type).toBe("password");
    expect(tautulliDefinition.configFields[1].required).toBe(true);
  });

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("fetches data successfully with sessions", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              response: {
                data: {
                  sessions: [
                    {
                      title: "Movie 1",
                      user: "user1",
                      progress_percent: 50,
                      duration: 7200,
                      state: "playing",
                      video_decision: "transcode",
                      bandwidth: 5000000,
                    },
                    {
                      title: "Episode Title",
                      grandparent_title: "Show Name",
                      media_type: "episode",
                      season_number: 1,
                      episode_number: 5,
                      user: "user2",
                      progress_percent: 25,
                      duration: 3600,
                      state: "paused",
                      video_decision: "direct play",
                      bandwidth: 2000000,
                    },
                  ],
                },
              },
            }),
        }),
      );

      const result = await tautulliDefinition.fetchData!({
        url: "https://tautulli.example.com/",
        apiKey: "test-key",
      });

      expect(result._status).toBe("ok");
      expect(result.streamCount).toBe(2);
      expect(result.transcodeStreams).toBe(1);
      expect(result.directPlayStreams).toBe(1);
      expect(result.directStreamStreams).toBe(0);
      expect(result.sessions).toHaveLength(2);
      expect(result.sessions?.[0].title).toBe("Movie 1");
      expect(result.sessions?.[0].state).toBe("playing");
      expect(result.sessions?.[1].title).toBe("S01E05 - Episode Title");
      expect(result.sessions?.[1].subtitle).toBe("Show Name");
      expect(result.sessions?.[1].state).toBe("paused");
    });

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }));

      await expect(
        tautulliDefinition.fetchData!({
          url: "https://tautulli.example.com",
          apiKey: "bad-key",
        }),
      ).rejects.toThrow("Tautulli error: 500");
    });

    it("handles empty sessions", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: { data: {} } }),
        }),
      );

      const result = await tautulliDefinition.fetchData!({
        url: "https://tautulli.example.com",
        apiKey: "test-key",
      });

      expect(result.streamCount).toBe(0);
      expect(result.totalBandwidth).toBe("0 B/s");
      expect(result.sessions).toEqual([]);
    });

    it("uses view_offset for progress when available", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              response: {
                data: {
                  sessions: [
                    {
                      title: "Movie",
                      user: "user1",
                      progress_percent: 50,
                      duration: 7200000,
                      view_offset: 1800000,
                      state: "playing",
                      video_decision: "transcode",
                      bandwidth: 5000000,
                    },
                  ],
                },
              },
            }),
        }),
      );

      const result = await tautulliDefinition.fetchData!({
        url: "https://tautulli.example.com",
        apiKey: "test-key",
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions?.[0].progress).toBe(1800);
    });

    it("falls back to progress_percent when view_offset is not available", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              response: {
                data: {
                  sessions: [
                    {
                      title: "Movie",
                      user: "user1",
                      progress_percent: 25,
                      duration: 3600000,
                      state: "playing",
                      video_decision: "direct play",
                      bandwidth: 2000000,
                    },
                  ],
                },
              },
            }),
        }),
      );

      const result = await tautulliDefinition.fetchData!({
        url: "https://tautulli.example.com",
        apiKey: "test-key",
      });

      expect(result.sessions).toHaveLength(1);
      expect(result.sessions?.[0].progress).toBe(900);
    });

    it("includes API key in URL", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ response: { data: {} } }),
        }),
      );
      vi.stubGlobal("fetch", mockFetch);

      await tautulliDefinition.fetchData!({
        url: "https://tautulli.example.com",
        apiKey: "secret-key",
      });

      expect(mockFetch).toHaveBeenCalledWith(
        "https://tautulli.example.com/api/v2?apikey=secret-key&cmd=get_activity",
        expect.objectContaining({}),
      );
    });
  });

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = tautulliDefinition.toPayload!({
        _status: "ok",
        streamCount: 3,
        totalBandwidth: "15.0 MB/s",
        transcodeStreams: 2,
        directPlayStreams: 5,
        directStreamStreams: 8,
      });
      expect(payload.stats).toHaveLength(5);
      expect(payload.stats[0].value).toBe(3);
      expect(payload.stats[0].label).toBe("Streams");
      expect(payload.stats[1].value).toBe("15.0 MB/s");
      expect(payload.stats[1].label).toBe("Bandwidth");
      expect(payload.stats[2].value).toBe(2);
      expect(payload.stats[2].label).toBe("Transcoding");
    });

    it("includes sessions when present", () => {
      const payload = tautulliDefinition.toPayload!({
        _status: "ok",
        streamCount: 1,
        totalBandwidth: "1.0 MB/s",
        transcodeStreams: 0,
        directPlayStreams: 1,
        directStreamStreams: 0,
        sessions: [
          {
            title: "Movie",
            user: "user1",
            progress: 3600,
            duration: 7200,
            state: "playing",
          },
        ],
      });
      expect(payload.streams).toHaveLength(1);
      expect(payload.streams![0].title).toBe("Movie");
    });

    it("excludes sessions when empty", () => {
      const payload = tautulliDefinition.toPayload!({
        _status: "ok",
        streamCount: 0,
        totalBandwidth: "0 B/s",
        transcodeStreams: 0,
        directPlayStreams: 0,
        directStreamStreams: 0,
      });
      expect(payload.streams).toBeUndefined();
    });
  });
});
