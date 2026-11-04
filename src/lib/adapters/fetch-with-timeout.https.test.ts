import { afterEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  handlers: {} as Record<string, (error?: Error) => void>,
  destroy: vi.fn(),
  setTimeout: vi.fn(),
}));
vi.mock("node:https", () => ({
  Agent: class {},
  request: () => ({
    on: (name: string, fn: (error?: Error) => void) => {
      mocks.handlers[name] = fn;
    },
    setTimeout: mocks.setTimeout,
    end: vi.fn(),
    write: vi.fn(),
    destroy: (error: Error) => {
      mocks.destroy(error);
      mocks.handlers.error?.(error);
    },
  }),
}));
import { fetchWithTimeout } from "./fetch-with-timeout";
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});
describe("insecure HTTPS request deadline", () => {
  it("ends a stalled HTTPS request at the hard deadline", async () => {
    vi.useFakeTimers();
    const outcome = fetchWithTimeout("https://local.test", { insecure: true }, 100).catch(
      (error) => error,
    );
    await vi.advanceTimersByTimeAsync(100);
    expect(mocks.destroy).toHaveBeenCalledOnce();
    expect(await outcome).toMatchObject({ name: "TimeoutError" });
  });
});
