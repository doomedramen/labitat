import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { WidgetContainer } from "./widget-container";

describe("service card metrics", () => {
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
