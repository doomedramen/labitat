"use server";

import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { decrypt } from "@/lib/crypto";
import { getService } from "@/lib/adapters";
import { serverCache } from "@/lib/server-cache";
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
  if (cached?.widgetData) {
    const age = Date.now() - cached.lastFetchedAt;
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
    serverCache.set(itemId, { widgetData: responseData });
    return responseData;
  } catch (err) {
    if (cached?.widgetData) {
      return {
        ...cached.widgetData,
        _status: "warn" as const,
        _statusText: "Showing cached data - unable to reach service",
      };
    }

    console.error(`[labitat] Failed to fetch data for item ${itemId} (${item.serviceType}):`, err);

    const isProduction = process.env.NODE_ENV === "production";
    const errorResponse: ServiceData = {
      _status: "error",
      _statusText: isProduction
        ? "Failed to fetch service data"
        : err instanceof Error
          ? err.message
          : "Failed to fetch data",
    };
    serverCache.set(itemId, { widgetData: errorResponse });
    return errorResponse;
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
