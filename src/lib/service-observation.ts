import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { serverCache } from "@/lib/server-cache";
import type { ServiceData } from "@/lib/adapters/types";

/** Reject results from a deleted item or credentials/endpoint that have changed. */
export function isCurrentConfiguration(itemId: string, revision: number): boolean {
  const row = db
    .select({ revision: items.configurationRevision })
    .from(items)
    .where(eq(items.id, itemId))
    .get();
  return !!row && row.revision === revision;
}

export function saveServiceObservation(
  itemId: string,
  revision: number,
  attemptAt: number,
  data: ServiceData,
): ServiceData {
  if (!isCurrentConfiguration(itemId, revision)) return data;
  const cached = serverCache.get(itemId);
  // Concurrent preview and background requests can complete out of order.
  if (
    cached?.configurationRevision === revision &&
    cached.lastAttemptAt !== null &&
    cached.lastAttemptAt > attemptAt
  )
    return cached.widgetData ?? data;
  const failed = data._status === "error";
  const previous =
    cached?.configurationRevision === revision || cached?.configurationRevision === null
      ? cached?.widgetData
      : null;
  const observed =
    failed && previous && previous._status !== "error"
      ? { ...previous, _status: "warn" as const, _statusText: data._statusText ?? "Update failed" }
      : data;
  serverCache.set(
    itemId,
    { widgetData: observed },
    { successful: !failed, attemptAt, configurationRevision: revision },
  );
  return observed;
}
