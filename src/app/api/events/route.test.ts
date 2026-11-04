import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  unsubscribe: vi.fn(),
  onUpdate: vi.fn(),
  getAll: vi.fn().mockReturnValue([]),
}));
vi.mock("@/lib/polling-supervisor", () => ({
  pollingSup: { connect: mocks.connect, disconnect: mocks.disconnect, getConnectionCount: () => 1 },
}));
vi.mock("@/lib/server-cache", () => ({
  serverCache: { onUpdate: mocks.onUpdate, getAll: mocks.getAll },
}));
import { GET } from "./route";
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe("SSE connection cleanup", () => {
  it("replays the latest cache with its original timestamps on every connection", async () => {
    const observation = {
      widgetData: { count: 4 },
      pingStatus: null,
      lastFetchedAt: 400,
      lastSuccessAt: 100,
      lastAttemptAt: 300,
      configurationRevision: 2,
      freshness: "stale",
    };
    mocks.getAll.mockReturnValueOnce([["a", observation]]);
    mocks.onUpdate.mockReturnValue(mocks.unsubscribe);
    const response = await GET(new NextRequest("http://localhost/api/events"));
    const reader = response.body!.getReader();
    const read = reader.read();
    // A connection must produce data immediately, without waiting for a poll/heartbeat.
    const result = await Promise.race([
      read,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 50)),
    ]);
    await reader.cancel();
    expect(result).not.toBeNull();
    const payload = JSON.parse(
      new TextDecoder()
        .decode(result!.value)
        .replace(/^data: /, "")
        .trim(),
    );
    expect(payload).toMatchObject({
      itemId: "a",
      fetchedAt: 400,
      lastSuccessAt: 100,
      configurationRevision: 2,
      freshness: "stale",
    });
    expect(mocks.onUpdate.mock.invocationCallOrder.at(-1)).toBeLessThan(
      mocks.connect.mock.invocationCallOrder.at(-1)!,
    );
  });
  it("releases each expired connection even if no request abort arrives", async () => {
    vi.useFakeTimers();
    mocks.onUpdate.mockReturnValue(mocks.unsubscribe);
    for (let i = 0; i < 3; i++) {
      const response = await GET(new NextRequest("http://localhost/api/events"));
      const reader = response.body!.getReader();
      await vi.advanceTimersByTimeAsync(300_000);
      expect(mocks.disconnect).toHaveBeenCalledTimes(i + 1);
      await reader.cancel();
    }
    expect(mocks.disconnect).toHaveBeenCalledTimes(3);
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(3);
  });
  it("releases a cancelled stream once, including a later abort", async () => {
    mocks.onUpdate.mockReturnValue(mocks.unsubscribe);
    const abort = new AbortController();
    const response = await GET(
      new NextRequest("http://localhost/api/events", { signal: abort.signal }),
    );
    await response.body!.cancel();
    abort.abort();
    expect(mocks.disconnect).toHaveBeenCalledTimes(1);
    expect(mocks.unsubscribe).toHaveBeenCalledTimes(1);
  });
});
