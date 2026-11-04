import type { CSSProperties } from "react";
import { getService } from "./adapters";
import { parseStatCardOrder } from "./stat-card-layout";
import type { ItemRow } from "./types";

type BoardItem = Pick<ItemRow, "serviceType" | "statCardOrder">;
export function hasMetricSlots(item: BoardItem): boolean {
  const selection = parseStatCardOrder(item.statCardOrder);
  if (selection && selection.active.length === 0) return false;
  const service = item.serviceType ? getService(item.serviceType) : undefined;
  return !!(service?.toPayload || service?.toMetrics);
}

export type BoardStyle = CSSProperties & Record<`--${string}`, string | number>;
/** Structural placement only: polling cannot move a panel or reshuffle services. */
export function placeDashboardGroups(
  groups: { id: string; items: BoardItem[] }[],
): Record<string, BoardStyle> {
  const result: Record<string, BoardStyle> = {};
  for (const touch of [false, true])
    for (const columns of [2, 3, 4]) {
      const lanes = Array(columns).fill(0) as number[];
      for (const group of groups) {
        const lane = lanes.indexOf(Math.min(...lanes));
        const height =
          62 +
          (group.items.length
            ? group.items.reduce(
                (total, item) =>
                  total + (hasMetricSlots(item) ? (touch ? 96 : 80) : touch ? 60 : 56),
                0,
              )
            : 56);
        result[group.id] ??= {};
        result[group.id][`--column-${touch ? "touch-" : ""}${columns}`] = lane + 1;
        result[group.id][`--row-${touch ? "touch-" : ""}${columns}`] =
          `${lanes[lane] + 1} / span ${height}`;
        lanes[lane] += height + 20;
      }
    }
  return result;
}
