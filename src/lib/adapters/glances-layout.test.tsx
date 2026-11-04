import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { WidgetContainer } from "@/components/widgets/widget-container";
import { glancesDefinition } from "./glances";
import { glancesPerCpuDefinition } from "./glances-percpu";

describe("Glances metric limits", () => {
  it("makes system metrics configurable and keeps uptime unused by default", () => {
    expect(glancesDefinition.toPayload).toBeTypeOf("function");
    const payload = glancesDefinition.toPayload!({
      cpuPercent: 31,
      memPercent: 52,
      memUsed: "4 GB",
      swapPercent: 0,
      load1: 1.2,
      uptime: "12 days",
    });
    render(<WidgetContainer payload={payload} />);
    expect(screen.getByText("CPU")).toBeVisible();
    expect(screen.queryByText("Uptime")).toBeNull();
  });
  it("keeps extra CPU cores available without showing them all by default", () => {
    expect(glancesPerCpuDefinition.toPayload).toBeTypeOf("function");
    const payload = glancesPerCpuDefinition.toPayload!({
      cores: 16,
      maxCore: 50,
      avgCpu: 20,
      coreUsages: Array(16).fill(20),
    });
    expect(payload.stats).toHaveLength(16);
    render(<WidgetContainer payload={payload} />);
    expect(screen.getByText("CPU 4")).toBeVisible();
    expect(screen.queryByText("CPU 5")).toBeNull();
  });
});
