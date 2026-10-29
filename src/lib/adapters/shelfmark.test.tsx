import { afterEach, describe, expect, it, vi } from "vitest";
import { shelfmarkDefinition as adapter } from "./shelfmark";
const config = { url: "https://example.org/books///", apiKey: "secret" };
const stats = {
  queue: { active: 2, queued: 3, awaiting_pickup: 4 },
  added: { total_7d: 25 },
  requests: { pending: 6 },
  errors: { failed_7d: 7 },
};
function mock(body: unknown = stats, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
}
afterEach(() => vi.unstubAllGlobals());
describe("Shelfmark", () => {
  it("uses the aggregate stats API with header auth and URL base", async () => {
    mock();
    const data = await adapter.fetchData!(config);
    expect(fetch).toHaveBeenCalledWith(
      "https://example.org/books/api/stats",
      expect.objectContaining({ headers: { "X-Api-Key": "secret" } }),
    );
    expect(adapter.toPayload!(data).stats.map((s) => s.value)).toEqual([2, 3, 4, 25, 6, 7]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("supports empty unauthenticated instances", async () => {
    mock({
      queue: { active: 0, queued: 0, awaiting_pickup: 0 },
      added: { total_7d: 0 },
      requests: { pending: 0 },
      errors: { failed_7d: 0 },
    });
    expect(
      adapter.toPayload!(await adapter.fetchData!({ url: config.url })).stats.every(
        (s) => s.value === 0,
      ),
    ).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({ headers: {} }),
    );
  });
  it.each([401, 403, 404, 500])("reports HTTP %s", async (status) => {
    mock({}, status);
    await expect(adapter.fetchData!(config)).rejects.toThrow(`stats error: ${status}`);
  });
  it.each([
    null,
    {},
    [],
    { ...stats, queue: null },
    { ...stats, queue: {} },
    { ...stats, errors: { failed_7d: "7" } },
    { ...stats, added: { total_7d: -1 } },
    { ...stats, requests: { pending: 0.5 } },
  ])("rejects malformed statistics %j", async (body) => {
    mock(body);
    await expect(adapter.fetchData!(config)).rejects.toThrow();
  });
  it("rejects malformed JSON", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Login</html>")));
    await expect(adapter.fetchData!(config)).rejects.toThrow();
  });
  it("requires URL", async () => {
    await expect(adapter.fetchData!({})).rejects.toThrow("URL is required");
  });
  it("propagates network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unreachable")));
    await expect(adapter.fetchData!(config)).rejects.toThrow("unreachable");
  });
});
