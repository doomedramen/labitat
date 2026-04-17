"use client";

import { useMemo } from "react";
import { useLiveDataEntry } from "@/hooks/use-live-data";
import type { ItemWithCache } from "@/lib/types";
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types";
import { dataToStatus } from "@/lib/adapters/types";
import { getService } from "@/lib/adapters";

interface UseItemDataOptions {
  editMode: boolean;
  item: ItemWithCache;
}

interface UseItemDataResult {
  effectiveData: ServiceData | null;
  effectiveLoading: boolean;
  serviceStatus: ServiceStatus;
  hasStatus: boolean;
  isCached: boolean;
  isClientSide: boolean;
}

export function useItemData({ editMode, item }: UseItemDataOptions): UseItemDataResult {
  const serviceDef = item.serviceType ? getService(item.serviceType) : null;
  const isClientSide = serviceDef?.clientSide ?? false;

  const liveData = useLiveDataEntry(item.id);

  const isCached = useMemo(() => {
    if (editMode) return false;
    if (liveData.pingStatus || liveData.widgetData) return false;
    return !!(item.cachedPingStatus || item.cachedWidgetData);
  }, [
    editMode,
    liveData.pingStatus,
    liveData.widgetData,
    item.cachedPingStatus,
    item.cachedWidgetData,
  ]);

  // Use live SSE data, fall back to SSR cache
  const effectiveData = useMemo(() => {
    if (editMode) return null;
    return liveData.widgetData ?? item.cachedWidgetData ?? null;
  }, [editMode, liveData.widgetData, item.cachedWidgetData]);

  const hasStatus = !!item.href && !isClientSide;

  const serviceStatus: ServiceStatus = useMemo(() => {
    if (editMode) return { state: "unknown" };
    if (liveData.pingStatus) return liveData.pingStatus;
    if (liveData.widgetData) return dataToStatus(liveData.widgetData);
    if (item.cachedPingStatus) return item.cachedPingStatus;
    if (item.cachedWidgetData) return dataToStatus(item.cachedWidgetData);
    return { state: "unknown" };
  }, [
    editMode,
    liveData.pingStatus,
    liveData.widgetData,
    item.cachedPingStatus,
    item.cachedWidgetData,
  ]);

  return {
    effectiveData,
    effectiveLoading: false, // No loading state — data is always available from cache
    serviceStatus,
    hasStatus,
    isCached,
    isClientSide,
  };
}
