import { afterEach, describe, expect, it, vi } from "vitest";
import { norishDefinition as adapter } from "./norish";
const config = { url: "https://example.org/norish///", apiKey: "secret" };
const valid = [
  { total: 250, recipes: [] },
  [{ isDone: false }, { isDone: true }, { isDone: false }],
  [{ id: "meal", recipeName: "Soup" }],
];
function mock(values: unknown[] = valid, failure = -1, status = 500) {
  let index = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const i = index++;
      return new Response(JSON.stringify(values[i]), { status: i === failure ? status : 200 });
    }),
  );
}
afterEach(() => vi.unstubAllGlobals());
describe("Norish", () => {
  it("uses the recipe total rather than page size and splits groceries", async () => {
    mock();
    const data = await adapter.fetchData!(config);
    expect(data).toEqual({ _status: "ok", recipes: 250, pending: 2, done: 1, today: 1 });
    expect(fetch).toHaveBeenCalledWith(
      "https://example.org/norish/api/v1/recipes/search",
      expect.objectContaining({
        method: "POST",
        headers: { "x-api-key": "secret", "Content-Type": "application/json" },
        body: JSON.stringify({ cursor: 0, limit: 1 }),
      }),
    );
    expect(fetch).toHaveBeenCalledWith(
      "https://example.org/norish/api/v1/planned-recipes/today",
      expect.objectContaining({ method: "GET", headers: { "x-api-key": "secret" } }),
    );
    expect(adapter.toPayload!(data).stats.map((s) => s.value)).toEqual([250, 2, 1, 1]);
  });
  it("supports an empty household", async () => {
    mock([{ total: 0, recipes: [] }, [], []]);
    expect(await adapter.fetchData!(config)).toEqual({
      _status: "ok",
      recipes: 0,
      pending: 0,
      done: 0,
      today: 0,
    });
  });
  it.each([0, 1, 2])("rejects failures at endpoint %s", async (index) => {
    mock(valid, index, 401);
    await expect(adapter.fetchData!(config)).rejects.toThrow("401");
  });
  it.each([
    null,
    {},
    { total: -1, recipes: [] },
    { total: 1.5, recipes: [] },
    { total: "2", recipes: [] },
    { total: 2 },
  ])("rejects malformed recipe responses %j", async (value) => {
    mock([value, valid[1], valid[2]]);
    await expect(adapter.fetchData!(config)).rejects.toThrow();
  });
  it.each([null, {}, [null], [{}], [{ isDone: "false" }]])(
    "rejects malformed groceries %j",
    async (value) => {
      mock([valid[0], value, valid[2]]);
      await expect(adapter.fetchData!(config)).rejects.toThrow("groceries response");
    },
  );
  it.each([null, {}, [null], [{}]])("rejects malformed meal plans %j", async (value) => {
    mock([valid[0], valid[1], value]);
    await expect(adapter.fetchData!(config)).rejects.toThrow("planned recipes response");
  });
  it.each([{}, { url: config.url }])("requires configuration %j", async (value) => {
    await expect(
      adapter.fetchData!(
        Object.fromEntries(
          Object.entries(value).filter(
            (entry): entry is [string, string] => typeof entry[1] === "string",
          ),
        ),
      ),
    ).rejects.toThrow("required");
  });
  it("propagates network errors", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unreachable")));
    await expect(adapter.fetchData!(config)).rejects.toThrow("unreachable");
  });
});
