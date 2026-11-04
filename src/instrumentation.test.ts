import { afterEach, expect, it, vi } from "vitest";
const start = vi.hoisted(() => vi.fn());
vi.mock("./lib/operator-runtime", () => ({ startOperatorRuntime: start }));
import { register } from "./instrumentation";
afterEach(() => {
  vi.unstubAllEnvs();
  start.mockClear();
});
it("skips collection in build, edge, and test runtimes", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  vi.stubEnv("NEXT_PHASE", "phase-production-build");
  await register();
  expect(start).not.toHaveBeenCalled();
  vi.stubEnv("NEXT_PHASE", "phase-production-server");
  vi.stubEnv("NEXT_RUNTIME", "edge");
  await register();
  expect(start).not.toHaveBeenCalled();
});
it("starts collection at Node server startup", async () => {
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("NEXT_PHASE", "phase-production-server");
  vi.stubEnv("NEXT_RUNTIME", "nodejs");
  await register();
  expect(start).toHaveBeenCalledOnce();
});
