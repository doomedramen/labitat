import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WidgetContainer } from "./widget-container";

describe("service card metrics", () => {
  const stats = Array.from({ length: 7 }, (_, i) => ({
    id: `m${i}`,
    value: i,
    label: `Metric ${i}`,
  }));
  it("shows at most four default metrics, including oversized adapter defaults", () => {
    const { rerender } = render(<WidgetContainer payload={{ stats }} />);
    expect(screen.queryByText("Metric 4")).toBeNull();
    rerender(<WidgetContainer payload={{ stats }} defaultActiveIds={stats.map((s) => s.id)} />);
    expect(screen.queryByText("Metric 4")).toBeNull();
  });
  it("only shows explicitly saved metrics; new metrics stay unused", () => {
    render(
      <WidgetContainer payload={{ stats }} statCardOrder={{ active: ["m2"], unused: ["m0"] }} />,
    );
    expect(screen.getByText("Metric 2")).toBeVisible();
    expect(screen.queryByText("Metric 1")).toBeNull();
  });
  it("allows an explicit selection above four and honors all-hidden", () => {
    const { rerender } = render(
      <WidgetContainer
        payload={{ stats }}
        statCardOrder={{ active: stats.map((s) => s.id), unused: [] }}
      />,
    );
    expect(screen.getByText("Metric 6")).toBeVisible();
    rerender(<WidgetContainer payload={{ stats }} statCardOrder={{ active: [], unused: [] }} />);
    expect(screen.queryByText("Metric 0")).toBeNull();
  });
  it("uses the saved order for the primary metric and hides unused metrics", () => {
    const { container } = render(
      <WidgetContainer
        payload={{
          stats: [
            { id: "nodes", value: 3, label: "Nodes" },
            { id: "cpu", value: "31.7%", label: "CPU" },
            { id: "memory", value: "62%", label: "Memory" },
          ],
        }}
        statCardOrder={{ active: ["cpu", "nodes"], unused: ["memory"] }}
      />,
    );
    expect(container.textContent).toBe("31.7%CPU3Nodes");
    expect(screen.queryByText("Memory")).toBeNull();
  });
  it("keeps failures visible without rendering misleading zero metrics", () => {
    render(<WidgetContainer payload={{ stats: [], error: "Connection timed out" }} />);
    expect(screen.getByRole("status")).toHaveTextContent("Connection timed out");
  });
});
