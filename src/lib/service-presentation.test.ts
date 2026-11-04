import { describe, expect, it } from "vitest";
import { getServicePresentation } from "./service-presentation";
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
