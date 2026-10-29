import { afterEach, describe, expect, it, vi } from "vitest";
import { whisparrDefinition } from "./whisparr";

afterEach(() => vi.unstubAllGlobals());

describe("Whisparr", () => {
  it.each([undefined, "3", "2"])("uses the correct library for version %s", async (version) => {
    const urls: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) => {
        urls.push(url);
        return new Response(
          JSON.stringify(
            /\/(movie|series)$/.test(url) ? [{ id: 1 }] : { totalRecords: 2, records: [] },
          ),
        );
      }),
    );
    const data = await whisparrDefinition.fetchData!({
      url: "https://example.org/base/",
      apiKey: "test",
      ...(version ? { version } : {}),
    });
    expect(urls).toContain(
      `https://example.org/base/api/v3/${version === "2" ? "series" : "movie"}`,
    );
    expect(whisparrDefinition.toPayload!(data).stats?.at(-1)?.label).toBe(
      version === "2" ? "Series" : "Scenes / movies",
    );
  });
  it("rejects unsupported versions", async () => {
    await expect(whisparrDefinition.fetchData!({ version: "4" })).rejects.toThrow(
      "version must be",
    );
  });
});
