import { afterEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  initialize: vi.fn(),
  prune: vi.fn(),
  maintenance: vi.fn(),
  start: vi.fn(),
}));
vi.mock("./dashboard-layout", () => ({ initializeLayoutState: mocks.initialize }));
vi.mock("./history-store", () => ({
  pruneHistory: mocks.prune,
  pruneHistoryIfDue: mocks.maintenance,
}));
vi.mock("./polling-supervisor", () => ({ pollingSup: { startBackground: mocks.start } }));
import { startOperatorRuntime } from "./operator-runtime";
const runtime = globalThis as typeof globalThis & { __labitatOperatorStarted?: boolean };
afterEach(() => {
  delete runtime.__labitatOperatorStarted;
  vi.clearAllMocks();
});
it("guards duplicate initialization across server bundle registrations", () => {
  startOperatorRuntime();
  startOperatorRuntime();
  expect(mocks.initialize).toHaveBeenCalledOnce();
  expect(mocks.prune).toHaveBeenCalledOnce();
  expect(mocks.start).toHaveBeenCalledExactlyOnceWith(mocks.maintenance);
});
it("does not mark a failed initialization complete", () => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
  mocks.initialize.mockImplementationOnce(() => {
    throw new Error("Missing migration");
  });
  startOperatorRuntime();
  expect(mocks.start).not.toHaveBeenCalled();
  startOperatorRuntime();
  expect(mocks.start).toHaveBeenCalledOnce();
  vi.restoreAllMocks();
});
