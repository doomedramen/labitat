import type { ActiveStream } from "@/components/widgets/active-stream/types";
import type { DownloadItemData } from "@/components/widgets/download/types";
import { getService } from "./adapters";
import type { ItemLive } from "./live-types";
import { serviceHealth } from "./service-health";
import type { ItemRow } from "./types";

export function serviceActivityKind(type: string | null): "downloads" | "streams" | null {
  return (type && getService(type)?.activityKind) || null;
}

export type ActivityObservation = {
  downloads: DownloadItemData[];
  streams: ActiveStream[];
  reason: string | null;
};

export function observeServiceActivity(
  item: ItemRow,
  live: ItemLive | null,
  now: number,
): ActivityObservation {
  const service = getService(item.serviceType ?? "");
  const health = serviceHealth(item, live, now, service?.clientSide);
  if (
    health.attention ||
    health.stale ||
    !live?.widgetData ||
    live.widgetData._status === "error"
  ) {
    return { downloads: [], streams: [], reason: health.reason || "Awaiting an update" };
  }
  try {
    const payload = service?.toPayload?.(live.widgetData);
    if (payload?.error) return { downloads: [], streams: [], reason: payload.error };
    return { downloads: payload?.downloads ?? [], streams: payload?.streams ?? [], reason: null };
  } catch {
    return { downloads: [], streams: [], reason: "Activity unavailable" };
  }
}

export function activityProgress(progress: number | undefined, total: number): number | null {
  return typeof progress === "number" &&
    Number.isFinite(progress) &&
    Number.isFinite(total) &&
    total > 0
    ? Math.max(0, Math.min(100, (progress / total) * 100))
    : null;
}
