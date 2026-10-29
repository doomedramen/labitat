import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({
  connect: vi.fn(),
  disconnect: vi.fn(),
  unsubscribe: vi.fn(),
  onUpdate: vi.fn(),
}));
vi.mock("@/lib/polling-supervisor", () => ({
  pollingSup: { connect: mocks.connect, disconnect: mocks.disconnect, getConnectionCount: () => 1 },
}));
vi.mock("@/lib/server-cache", () => ({ serverCache: { onUpdate: mocks.onUpdate } }));
import { GET } from "./route";
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe("SSE connection cleanup", () => {
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
