"use server";

import { serviceFailureReason } from "@/lib/service-failure";

import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { getService } from "@/lib/adapters";
import { serverCache } from "@/lib/server-cache";
import { saveServiceObservation } from "@/lib/service-observation";
import type { ServiceData } from "@/lib/adapters/types";

export async function fetchServiceData(itemId: string): Promise<ServiceData> {
  const [item] = await db.select().from(items).where(eq(items.id, itemId));
  if (!item) {
    return { _status: "error", _statusText: "Item not found" };
  }

  if (!item.serviceType) {
    return { _status: "none" };
  }

  const adapter = getService(item.serviceType);
  if (!adapter) {
    return { _status: "error", _statusText: "Unknown service type" };
  }

  const pollingMs = item.pollingMs ?? adapter.defaultPollingMs ?? 10000;

  const cached = serverCache.get(itemId);
  if (
    cached?.widgetData &&
    cached.freshness === "fresh" &&
    cached.lastSuccessAt !== null &&
    cached.configurationRevision === item.configurationRevision
  ) {
    const age = Date.now() - cached.lastSuccessAt;
    if (age < pollingMs) return cached.widgetData;
  }

  const config: Record<string, string> = {};
  if (item.serviceUrl) config.url = item.serviceUrl;
  if (item.configEnc) {
    try {
      const decryptedConfig = JSON.parse(await decrypt(item.configEnc));
      Object.assign(config, decryptedConfig);
    } catch (err) {
      console.error(
        `[labitat] Failed to decrypt config for item ${itemId} (${item.serviceType}):`,
        err instanceof Error ? err.message : err,
      );
      return {
        _status: "error",
        _statusText: "Failed to decrypt credentials — check SECRET_KEY",
      };
    }
  }

  const attemptAt = Date.now();
  try {
    if (!adapter.fetchData) {
      return { _status: "none" as const, ...config };
    }

    if (adapter.clientSide && adapter.fetchData) {
      const data = await adapter.fetchData(config);
      return { ...data, _status: data._status ?? "none" };
    }

    const data = await adapter.fetchData(config);
    const responseData: ServiceData = {
      ...data,
      _status: data._status ?? "ok",
    };
    return saveServiceObservation(itemId, item.configurationRevision, attemptAt, responseData);
  } catch (err) {
    return saveServiceObservation(itemId, item.configurationRevision, attemptAt, {
      _status: "error",
      _statusText: serviceFailureReason(err),
    });
  }
}

export async function fetchAllServiceData(itemIds: string[]): Promise<Record<string, ServiceData>> {
  const results: Record<string, ServiceData> = {};
  const queue = [...itemIds];
  const concurrency = 8;

  const worker = async () => {
    while (queue.length > 0) {
      const id = queue.shift();
      if (!id) break;
      results[id] = await fetchServiceData(id);
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, itemIds.length) }, () => worker()));

  return results;
}

/** Only benign client-widget settings may cross the public read boundary. */
export async function getClientWidgetConfig(
  itemId: string,
): Promise<{ timeZone?: string; format24h?: boolean }> {
  const item = db.select().from(items).where(eq(items.id, itemId)).get();
  if (!item || item.serviceType !== "datetime" || !item.configEnc) return {};
  try {
    const config = JSON.parse(await decrypt(item.configEnc));
    return {
      timeZone: typeof config.timeZone === "string" ? config.timeZone : undefined,
      format24h: config.format24h === "true",
    };
  } catch {
    return {};
  }
}
