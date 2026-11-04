import { and, desc, eq, gte, lt, lte } from "drizzle-orm";
import { db } from "@/lib/db";
import { items, metricHistory, healthHistory } from "@/lib/db/schema";
import { getService } from "@/lib/adapters";
import { dataToStatus, type ServiceData, type ServiceStatus } from "@/lib/adapters/types";
import { getServicePresentation } from "./service-presentation";
import { parseStatCardOrder, resolveStatCardLayout } from "./stat-card-layout";
import {
  HISTORY_RANGES,
  type HistoryRange,
  type HistoryResponse,
  type HistoryValues,
} from "./history-types";
const DAY = 86_400_000;
let lastCleanup = 0;
export function pruneHistory(now = Date.now()) {
  db.transaction((tx) => {
    tx.delete(metricHistory)
      .where(lt(metricHistory.bucketAt, now - DAY))
      .run();
    tx.delete(healthHistory)
      .where(lt(healthHistory.observedAt, now - DAY))
      .run();
  });
  lastCleanup = now;
}
export function pruneHistoryIfDue(now = Date.now()) {
  if (now < lastCleanup || now - lastCleanup >= 3_600_000) pruneHistory(now);
}
function safeReason(value: string | undefined): string | null {
  return value?.replace(/https?:\/\/\S+/gi, "service endpoint").slice(0, 200) || null;
}

export function recordHistory(
  itemId: string,
  revision: number,
  observedAt: number,
  data: ServiceData | null,
  ping: ServiceStatus | null,
  successful: boolean,
): void {
  const item = db.select().from(items).where(eq(items.id, itemId)).get();
  if (!item || item.configurationRevision !== revision) return;
  const service = item.serviceType ? getService(item.serviceType) : null;
  if (service?.clientSide || ["matrix", "pipes", "search"].includes(item.serviceType ?? "")) return;
  const presentation = getServicePresentation(service, data);
  const { activeItems } = resolveStatCardLayout(
    presentation.metrics,
    parseStatCardOrder(item.statCardOrder),
    presentation.defaultActiveIds,
  );
  const values: HistoryValues = {};
  if (successful)
    for (const metric of activeItems) {
      if (metric.numericValue !== undefined && metric.unit && Number.isFinite(metric.numericValue))
        values[metric.id] = { value: metric.numericValue, unit: metric.unit };
    }
  const widgetStatus = data ? dataToStatus(data) : { state: "unknown" as const };
  const status = !successful
    ? {
        state: "error",
        reason: data?._statusText ?? (ping && "reason" in ping ? ping.reason : "Update failed"),
      }
    : widgetStatus.state === "degraded" || widgetStatus.state === "error"
      ? widgetStatus
      : (ping ?? widgetStatus);
  const reason = safeReason("reason" in status ? status.reason : undefined);
  db.transaction((tx) => {
    if (Object.keys(values).length)
      tx.insert(metricHistory)
        .values({
          itemId,
          configurationRevision: revision,
          bucketAt: Math.floor(observedAt / 60000) * 60000,
          observedAt,
          values,
        })
        .onConflictDoNothing()
        .run();
    const previous = tx
      .select()
      .from(healthHistory)
      .where(
        and(eq(healthHistory.itemId, itemId), eq(healthHistory.configurationRevision, revision)),
      )
      .orderBy(desc(healthHistory.observedAt), desc(healthHistory.id))
      .limit(1)
      .get();
    if (
      !previous ||
      (observedAt >= previous.observedAt &&
        (previous.state !== status.state || previous.reason !== reason))
    )
      tx.insert(healthHistory)
        .values({
          itemId,
          configurationRevision: revision,
          observedAt,
          state: status.state,
          reason,
        })
        .run();
    const now = Date.now();
    if (now - lastCleanup >= 3_600_000) {
      tx.delete(metricHistory)
        .where(lt(metricHistory.bucketAt, now - DAY))
        .run();
      tx.delete(healthHistory)
        .where(lt(healthHistory.observedAt, now - DAY))
        .run();
      lastCleanup = now;
    }
  });
}

export function readHistory(
  itemId: string,
  metric: string | null,
  range: HistoryRange,
  now = Date.now(),
): HistoryResponse | null {
  const item = db.select().from(items).where(eq(items.id, itemId)).get();
  if (!item) return null;
  const count = HISTORY_RANGES[range];
  const end = Math.floor(now / 60000) * 60000;
  const start = end - (count - 1) * 60000;
  const rows = metric
    ? db
        .select()
        .from(metricHistory)
        .where(
          and(
            eq(metricHistory.itemId, itemId),
            eq(metricHistory.configurationRevision, item.configurationRevision),
            gte(metricHistory.bucketAt, start),
            lte(metricHistory.bucketAt, end),
          ),
        )
        .orderBy(desc(metricHistory.bucketAt))
        .limit(count)
        .all()
    : [];
  const unit = metric
    ? (rows.find((row) => row.values[metric])?.values[metric]?.unit ?? null)
    : null;
  const byBucket = new Map(
    rows.map((row) => [row.bucketAt, metric ? row.values[metric] : undefined]),
  );
  return {
    metric,
    unit,
    points: metric
      ? Array.from({ length: count }, (_, index) => {
          const timestamp = start + index * 60000;
          const value = byBucket.get(timestamp);
          return {
            timestamp,
            value:
              value?.unit === unit &&
              typeof value?.value === "number" &&
              Number.isFinite(value.value)
                ? value.value
                : null,
          };
        })
      : [],
    transitions: db
      .select()
      .from(healthHistory)
      .where(
        and(
          eq(healthHistory.itemId, itemId),
          eq(healthHistory.configurationRevision, item.configurationRevision),
          gte(healthHistory.observedAt, now - count * 60000),
          lte(healthHistory.observedAt, now),
        ),
      )
      .orderBy(desc(healthHistory.observedAt))
      .limit(1440)
      .all()
      .map((row) => ({ timestamp: row.observedAt, state: row.state, reason: row.reason })),
  };
}
