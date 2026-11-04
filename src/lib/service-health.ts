import type { ItemLive } from "./live-types";
import { dataToStatus } from "./adapters/types";
import type { ItemRow } from "./types";
export function serviceHealth(
  item: ItemRow,
  live: ItemLive | null,
  now: number,
  clientSide = false,
) {
  const widget = live?.widgetData ? dataToStatus(live.widgetData) : null;
  const status =
    widget?.state === "error" || widget?.state === "degraded"
      ? widget
      : (live?.pingStatus ?? widget ?? { state: "unknown" as const });
  const attention =
    !clientSide && ["error", "unreachable", "degraded", "slow"].includes(status.state);
  const hasValues = !!live?.widgetData && live.widgetData._status !== "error";
  const stale =
    !clientSide &&
    (hasValues || live?.lastSuccessAt != null) &&
    (live?.freshness !== "fresh" ||
      live?.lastSuccessAt == null ||
      now - live.lastSuccessAt > Math.max((item.pollingMs ?? 30000) * 2, 30000));
  const reason = attention
    ? "reason" in status && status.reason
      ? status.reason
      : "Needs attention"
    : stale
      ? "Saved data · awaiting an update"
      : "";
  return {
    status,
    tone: ["degraded", "slow"].includes(status.state) ? ("warning" as const) : ("error" as const),
    attention,
    stale,
    reason,
    label: attention
      ? "Needs attention"
      : stale
        ? "Stale"
        : clientSide
          ? "Utility"
          : status.state === "unknown"
            ? "Awaiting status"
            : "Healthy",
  };
}
