import { afterEach, describe, expect, it, vi } from "vitest";
import { stashDefinition as adapter } from "./stash";
const stats = {
  scene_count: 10,
  image_count: 20,
  gallery_count: 3,
  performer_count: 4,
  studio_count: 5,
  tag_count: 6,
};
const config = { url: "https://example.org/stash///", apiKey: "secret" };
function mock(body: unknown, status = 200) {
  return vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })),
  );
}
afterEach(() => vi.unstubAllGlobals());
describe("Stash", () => {
  it("queries aggregate statistics with authentication and preserves URL bases", async () => {
    mock({ data: { stats } });
    const data = await adapter.fetchData!(config);
    expect(fetch).toHaveBeenCalledWith(
      "https://example.org/stash/graphql",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json", ApiKey: "secret" },
      }),
    );
    expect(adapter.toPayload!(data).stats.map(({ value }) => value)).toEqual([10, 20, 3, 4, 5, 6]);
  });
  it("supports unauthenticated instances and zero counts", async () => {
    mock({ data: { stats: Object.fromEntries(Object.keys(stats).map((key) => [key, 0])) } });
    const data = await adapter.fetchData!({ url: config.url });
    expect(adapter.toPayload!(data).stats.every((stat) => stat.value === 0)).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: { "Content-Type": "application/json" } }),
    );
  });
  it.each([401, 403, 500])("rejects HTTP %s", async (status) => {
    mock({}, status);
    await expect(adapter.fetchData!(config)).rejects.toThrow(`Stash error: ${status}`);
  });
  it.each([
    null,
    {},
    { data: null },
    { data: { stats: {} } },
    { data: { stats: { ...stats, scene_count: "10" } } },
    { data: { stats: { ...stats, scene_count: -1 } } },
    { data: { stats: { ...stats, scene_count: 1.5 } } },
    { data: { stats }, errors: [{ message: "secret server detail" }] },
  ])("rejects malformed or partial results %j", async (body) => {
    mock(body);
    await expect(adapter.fetchData!(config)).rejects.toThrow();
  });
  it("requires a URL before fetching", async () => {
    await expect(adapter.fetchData!({})).rejects.toThrow("URL is required");
  });
  it("propagates network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unreachable")));
    await expect(adapter.fetchData!(config)).rejects.toThrow("unreachable");
  });
});
