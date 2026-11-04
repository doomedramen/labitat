import { expect, it } from "vitest";
import { hasMetricSlots, placeDashboardGroups } from "./dashboard-board";
const metric = { serviceType: "glances", statCardOrder: null };
const launcher = { serviceType: null, statCardOrder: null };
it("uses configuration, not live observations, to reserve row geometry", () => {
  expect(hasMetricSlots(metric)).toBe(true);
  expect(hasMetricSlots(launcher)).toBe(false);
  expect(
    hasMetricSlots({ ...metric, statCardOrder: JSON.stringify({ active: [], unused: ["cpu"] }) }),
  ).toBe(false);
});
it("balances whole panels without changing saved DOM or vertical reading order", () => {
  const groups = Array.from({ length: 6 }, (_, index) => ({
    id: String(index),
    items: Array(index + 1).fill(metric),
  }));
  const before = JSON.stringify(groups);
  const positions = placeDashboardGroups(groups);
  expect(JSON.stringify(groups)).toBe(before);
  for (const touch of [false, true])
    for (const columns of [2, 3, 4]) {
      const bottoms = Array(columns).fill(0);
      let previousTop = 0;
      for (const group of groups) {
        const column =
          Number(positions[group.id][`--column-${touch ? "touch-" : ""}${columns}`]) - 1;
        const [start, span] = String(
          positions[group.id][`--row-${touch ? "touch-" : ""}${columns}`],
        )
          .split(" / span ")
          .map(Number);
        expect(start).toBeGreaterThanOrEqual(bottoms[column]);
        expect(start).toBeGreaterThanOrEqual(previousTop);
        expect(span).toBe(62 + group.items.length * (touch ? 96 : 80));
        bottoms[column] = start + span;
        previousTop = start;
      }
    }
});
