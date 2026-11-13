import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { sonarrDefinition } from "./sonarr";
import { plexDefinition } from "./plex";
import { LIBRARY_COUNT_TTL_MS, clearLibraryCountCache } from "./library-count-cache";

const json = (body: unknown) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });

describe("library count cache", () => {
  beforeEach(() => clearLibraryCountCache());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("fetches the full *arr library at most once per TTL", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const fetch = vi.fn((url: string) =>
      url.endsWith("/api/v3/series") ? json([{ id: 1 }, { id: 2 }]) : json({ totalRecords: 0 }),
    );
    vi.stubGlobal("fetch", fetch);
    const config = { url: "http://sonarr", apiKey: "k" };
    const libraryCalls = () =>
      fetch.mock.calls.filter(([url]) => url.endsWith("/api/v3/series")).length;

    expect((await sonarrDefinition.fetchData!(config)).series).toBe(2);
    expect((await sonarrDefinition.fetchData!(config)).series).toBe(2);
    expect(libraryCalls()).toBe(1);

    vi.setSystemTime(Date.now() + LIBRARY_COUNT_TTL_MS);
    await sonarrDefinition.fetchData!(config);
    expect(libraryCalls()).toBe(2);
  });

  it("does not cache a failed library request", async () => {
    let fail = true;
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) =>
        url.endsWith("/api/v3/series")
          ? fail
            ? Promise.resolve({ ok: false, status: 500 })
            : json([{ id: 1 }])
          : json({ totalRecords: 0 }),
      ),
    );
    const config = { url: "http://sonarr", apiKey: "k" };
    await expect(sonarrDefinition.fetchData!(config)).rejects.toThrow("Sonarr error: 500");
    fail = false;
    expect((await sonarrDefinition.fetchData!(config)).series).toBe(1);
  });

  it("asks Plex for library totals without item bodies", async () => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string) => {
        urls.push(url);
        const text = url.endsWith("/library/sections")
          ? '<MediaContainer><Directory key="1" type="movie" /></MediaContainer>'
          : url.includes("/library/sections/1/all")
            ? '<MediaContainer size="0" totalSize="1234" />'
            : '<MediaContainer size="0" />';
        return Promise.resolve({ ok: true, text: () => Promise.resolve(text) });
      }),
    );
    const data = await plexDefinition.fetchData!({ url: "http://plex", token: "t" });
    expect(data.movies).toBe(1234);
    expect(urls).toContain(
      "http://plex/library/sections/1/all?X-Plex-Container-Start=0&X-Plex-Container-Size=0",
    );
  });
});
