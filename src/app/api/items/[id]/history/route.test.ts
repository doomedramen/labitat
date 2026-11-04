import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("@/lib/history-store", () => ({ readHistory: mocks.read }));
import { GET } from "./route";
beforeEach(() => mocks.read.mockReset());
const request = (query: string) =>
  GET(new Request(`https://lab.test/api/items/a/history${query}`), {
    params: Promise.resolve({ id: "a" }),
  });
it("uses dashboard public read access and disables response caching", async () => {
  mocks.read.mockReturnValue({
    metric: "cpu",
    unit: "percent",
    points: [{ timestamp: 1, value: 0 }],
    transitions: [],
  });
  const response = await request("?metric=cpu&range=24h");
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  expect(mocks.read).toHaveBeenCalledWith("a", "cpu", "24h");
});
it("rejects invalid and prototype ranges before touching storage", async () => {
  for (const query of ["?range=toString", "?range=7d", "?metric=bad%20metric", "?metric="])
    expect((await request(query)).status).toBe(400);
  expect(mocks.read).not.toHaveBeenCalled();
});
it("returns uncached 404 for an unknown service", async () => {
  mocks.read.mockReturnValue(null);
  const response = await request("");
  expect(response.status).toBe(404);
  expect(response.headers.get("cache-control")).toBe("no-store");
});
