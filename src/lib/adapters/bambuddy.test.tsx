import { afterEach, describe, expect, it, vi } from "vitest";
import { bambuddyDefinition as adapter } from "./bambuddy";
const config = { url: "https://example.org/bambu///", apiKey: "secret" };
function mock(
  list: unknown = [{ id: 1 }],
  statuses: unknown[] = [{ id: 1, connected: true, state: "RUNNING" }],
  failure = -1,
) {
  let index = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const i = index++;
      return new Response(JSON.stringify(i === 0 ? list : statuses[i - 1]), {
        status: i === failure ? 403 : 200,
      });
    }),
  );
}
afterEach(() => vi.unstubAllGlobals());
describe("Bambuddy", () => {
  it("fetches real status rather than treating active configuration as connectivity", async () => {
    mock(
      [{ id: 1, is_active: false }, { id: 2 }, { id: 3 }, { id: 4 }],
      [
        { id: 1, connected: true, state: "RUNNING" },
        { id: 2, connected: false, state: "RUNNING" },
        { id: 3, connected: true, state: "PAUSE" },
        { id: 4, connected: true, state: "IDLE" },
      ],
    );
    const data = await adapter.fetchData!(config);
    expect(data).toEqual({ _status: "ok", printers: 4, online: 3, printing: 1, paused: 1 });
    expect(fetch).toHaveBeenCalledWith(
      "https://example.org/bambu/api/v1/printers/",
      expect.objectContaining({ headers: { "X-API-Key": "secret" } }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://example.org/bambu/api/v1/printers/1/status",
      expect.any(Object),
    );
    expect(adapter.toPayload!(data).stats.map((s) => s.value)).toEqual([4, 3, 1, 1]);
  });
  it("supports empty unauthenticated instances", async () => {
    mock([]);
    expect(await adapter.fetchData!({ url: config.url })).toEqual({
      _status: "ok",
      printers: 0,
      online: 0,
      printing: 0,
      paused: 0,
    });
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(expect.any(String), {
      headers: {},
      signal: expect.any(AbortSignal),
    });
  });
  it("accepts disconnected null states and drops private response fields", async () => {
    mock(
      [{ id: 1, access_code: "private" }],
      [{ id: 1, connected: false, state: null, current_print: "private" }],
    );
    expect(await adapter.fetchData!(config)).toEqual({
      _status: "ok",
      printers: 1,
      online: 0,
      printing: 0,
      paused: 0,
    });
  });
  it.each([
    null,
    {},
    [null],
    [{}],
    [{ id: "1" }],
    [{ id: -1 }],
    [{ id: 1.5 }],
    [{ id: 1 }, { id: 1 }],
  ])("rejects invalid printer lists %j", async (list) => {
    mock(list);
    await expect(adapter.fetchData!(config)).rejects.toThrow();
  });
  it.each([
    null,
    {},
    { id: 2, connected: true },
    { id: 1, connected: "false" },
    { id: 1, connected: true, state: 42 },
  ])("rejects invalid statuses %j", async (status) => {
    mock([{ id: 1 }], [status]);
    await expect(adapter.fetchData!(config)).rejects.toThrow();
  });
  it.each([0, 1])("reports HTTP failures at request %s", async (index) => {
    mock(undefined, undefined, index);
    await expect(adapter.fetchData!(config)).rejects.toThrow("403");
  });
  it("requires URL", async () => {
    await expect(adapter.fetchData!({})).rejects.toThrow("URL is required");
  });
  it("propagates network failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unreachable")));
    await expect(adapter.fetchData!(config)).rejects.toThrow("unreachable");
  });
});
