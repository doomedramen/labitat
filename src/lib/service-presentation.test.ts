import { describe, expect, it } from "vitest";
import { fullMetric, getServicePresentation, compactMetric } from "./service-presentation";
import { getService } from "./adapters";
describe("serializable service metrics", () => {
  it("preserves IDs and values without copying JSX, icons or CSS", () => {
    const result = getServicePresentation(getService("radarr"), {
      queued: 0,
      missing: 3,
      wanted: 4,
      movies: 22,
    });
    expect(result.metrics[0]).toEqual({
      id: "queued",
      label: "Queued",
      displayValue: "0",
      numericValue: 0,
      unit: "count",
    });
    expect(JSON.parse(JSON.stringify(result))).toEqual(result);
  });
  it("uses native percentages and never parses display strings", () => {
    const result = getServicePresentation(getService("glances"), {
      cpuPercent: 12.5,
      memPercent: 61,
      load1: 1.2,
      swapPercent: 0,
    });
    expect(result.metrics.find((m) => m.id === "cpu")).toMatchObject({
      numericValue: 12.5,
      unit: "percent",
    });
    const speed = getServicePresentation(getService("qbittorrent"), {
      downSpeed: "1.4 GB/s",
      upSpeed: "0 B/s",
      activeDownloads: 0,
      queued: 0,
    });
    expect(speed.metrics[0].numericValue).toBeUndefined();
  });
  it("does not invent zero metrics for missing or erroneous data", () => {
    expect(getServicePresentation(getService("glances"), null).metrics).toEqual([]);
    expect(getServicePresentation(getService("radarr"), { _status: "error" }).metrics).toEqual([]);
  });
});

it("marks missing native fields unavailable while preserving real zero", () => {
  const metrics = getServicePresentation(getService("glances"), { cpuPercent: 0 }).metrics;
  expect(metrics.find((metric) => metric.id === "cpu")?.numericValue).toBe(0);
  expect(metrics.find((metric) => metric.id === "memory")?.displayValue).toBe("—");
});

it("retains capped and localized counts as native measurements and full detail values", () => {
  const pbs = getServicePresentation(getService("proxmox-backup-server"), {
    _status: "ok",
    failedTasks: 12345,
  });
  const failed = pbs.metrics.find((metric) => metric.id === "failed")!;
  expect(failed).toMatchObject({ numericValue: 12345, unit: "count", displayValue: "99+" });
  expect(fullMetric(failed)).toBe("12,345");
  expect(
    getServicePresentation(getService("emby"), { movies: 12345 }).metrics.find(
      (metric) => metric.id === "movies",
    ),
  ).toMatchObject({ numericValue: 12345, unit: "count" });
});
it("keeps native duration units without parsing display strings", () => {
  const result = getServicePresentation(getService("generic-ping"), {
    _status: "ok",
    online: true,
    responseTime: 12.5,
  });
  expect(result.metrics.find((metric) => metric.id === "response")).toMatchObject({
    numericValue: 0.0125,
    unit: "seconds",
  });
});

it.each([
  [0, "0B/s"],
  [839680, "840KB/s"],
  [13000000, "13MB/s"],
  [1000000000, "1GB/s"],
  [1000000000000, "1TB/s"],
  [999000000, "1GB/s"],
])("compacts native rate %s with byte units as %s", (value, expected) => {
  const metric = {
    id: "rate",
    label: "Rate",
    displayValue: "Full rate",
    numericValue: value,
    unit: "bytes/s" as const,
  };
  expect(compactMetric(metric)).toBe(expected);
  expect(fullMetric(metric)).toBe(`${new Intl.NumberFormat("en").format(value)} B/s`);
});
