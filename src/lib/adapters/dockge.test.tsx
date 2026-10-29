import { afterEach, describe, expect, it, vi } from "vitest";
import { dockgeDefinition as adapter } from "./dockge";
const config = { url: "http://docker-proxy:2375/v1.47///" };
function mock(body: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify(body), { status })));
}
afterEach(() => vi.unstubAllGlobals());
describe("Dockge", () => {
  it("counts actual host containers including stopped and standalone containers", async () => {
    mock({
      Containers: 12,
      ContainersRunning: 7,
      ContainersStopped: 4,
      ContainersPaused: 1,
      Name: "private-host",
    });
    const data = await adapter.fetchData!(config);
    expect(data).toEqual({ _status: "ok", containers: 12, running: 7 });
    expect(adapter.toPayload!(data).stats.map((s) => s.value)).toEqual([12, 7]);
    expect(fetch).toHaveBeenCalledWith(
      "http://docker-proxy:2375/v1.47/info",
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(fetch).toHaveBeenCalledTimes(1);
  });
  it("supports an empty Docker host", async () => {
    mock({ Containers: 0, ContainersRunning: 0 });
    expect(await adapter.fetchData!(config)).toEqual({ _status: "ok", containers: 0, running: 0 });
  });
  it.each([401, 403, 404, 500])("reports HTTP %s", async (status) => {
    mock({}, status);
    await expect(adapter.fetchData!(config)).rejects.toThrow(`info error: ${status}`);
  });
  it.each([
    null,
    [],
    {},
    { Containers: 1 },
    { Containers: "2", ContainersRunning: 1 },
    { Containers: -1, ContainersRunning: 0 },
    { Containers: 2, ContainersRunning: -1 },
    { Containers: 1.5, ContainersRunning: 1 },
    { Containers: 2, ContainersRunning: 0.5 },
    { Containers: 1, ContainersRunning: 2 },
  ])("rejects invalid counts %j", async (body) => {
    mock(body);
    await expect(adapter.fetchData!(config)).rejects.toThrow();
  });
  it("rejects Dockge HTML instead of reporting zero", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("<html>Dockge</html>")));
    await expect(adapter.fetchData!(config)).rejects.toThrow();
  });
  it("requires a URL", async () => {
    await expect(adapter.fetchData!({})).rejects.toThrow("URL is required");
  });
  it("propagates connection failures", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("unreachable")));
    await expect(adapter.fetchData!(config)).rejects.toThrow("unreachable");
  });
});
