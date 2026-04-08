"use client"

import { useEffect } from "react"
import useSWR, { type SWRConfiguration } from "swr"
import { getWidgetData } from "@/actions/widget-data"
import { pingUrl } from "@/actions/ping"
import { useNetworkState } from "@/hooks/use-network-state"
import { useDashboardStore } from "@/lib/stores/dashboard-store"
import { getService } from "@/lib/adapters"
import type { ItemRow } from "@/lib/types"
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types"
import { dataToStatus } from "@/lib/adapters/types"

// ── Hook: useItemData ─────────────────────────────────────────────────────────

interface UseItemDataOptions {
  editMode: boolean
  item: ItemRow
}

interface UseItemDataResult {
  effectiveData: ServiceData | null
  effectiveLoading: boolean
  serviceStatus: ServiceStatus
  hasStatus: boolean
  isClientSide: boolean
}

export function useItemData({
  editMode,
  item,
}: UseItemDataOptions): UseItemDataResult {
  const { isOnline, isServerAvailable } = useNetworkState()
  const isEffectivelyOffline = !isOnline || !isServerAvailable

  const serviceDef = item.serviceType ? getService(item.serviceType) : null
  const pollingMs = item.pollingMs ?? serviceDef?.defaultPollingMs ?? 30_000
  const isClientSide = serviceDef?.clientSide ?? false

  // Read cached data from store
  const cachedWidgetData = useDashboardStore((s) => s.widgetData[item.id])
  const cachedPingStatus = useDashboardStore((s) => s.pingStatus[item.id])
  const setWidgetData = useDashboardStore((s) => s.setWidgetData)
  const setPingStatus = useDashboardStore((s) => s.setPingStatus)

  // Determine what to fetch
  const shouldFetchService = !editMode && item.serviceType && serviceDef
  const shouldPing = !editMode && !item.serviceType && item.href

  // Error retry logic with exponential backoff
  const onErrorRetry: SWRConfiguration["onErrorRetry"] = (
    _error,
    _key,
    _config,
    revalidate,
    { retryCount }
  ) => {
    if (isEffectivelyOffline) return
    if (retryCount >= 5) return
    setTimeout(
      () => revalidate({ retryCount }),
      Math.min(1000 * 2 ** retryCount, pollingMs)
    )
  }

  // SWR for service data
  const {
    data: serviceData,
    isLoading: isServiceLoading,
    error: serviceError,
  } = useSWR<ServiceData | null>(
    shouldFetchService && !isClientSide && !isEffectivelyOffline
      ? `widget:${item.id}`
      : null,
    () => getWidgetData(item.id),
    {
      refreshInterval: isEffectivelyOffline ? 0 : pollingMs,
      dedupingInterval: pollingMs,
      revalidateOnFocus: false,
      revalidateIfStale: true,
      shouldRetryOnError: !isEffectivelyOffline,
      onErrorRetry,
    }
  )

  // SWR for ping data
  const {
    data: pingStatus,
    isLoading: isPingLoading,
    error: pingError,
  } = useSWR<ServiceStatus | null>(
    shouldPing && !isEffectivelyOffline ? `ping:${item.id}:${item.href}` : null,
    () => pingUrl(item.href!),
    {
      refreshInterval: isEffectivelyOffline ? 0 : pollingMs,
      dedupingInterval: pollingMs,
      revalidateOnFocus: false,
      revalidateIfStale: true,
      shouldRetryOnError: !isEffectivelyOffline,
      onErrorRetry,
    }
  )

  // Update store with fresh data
  useEffect(() => {
    if (serviceData) {
      setWidgetData(item.id, serviceData)
    }
  }, [serviceData, item.id, setWidgetData])

  useEffect(() => {
    if (pingStatus) {
      setPingStatus(item.id, pingStatus)
    }
  }, [pingStatus, item.id, setPingStatus])

  // Compute derived state
  const effectiveData = editMode
    ? null
    : (serviceData ?? cachedWidgetData ?? null)

  const effectiveLoading = editMode
    ? false
    : isEffectivelyOffline
      ? false
      : shouldFetchService && !isClientSide
        ? isServiceLoading && !cachedWidgetData
        : shouldPing
          ? isPingLoading && !cachedPingStatus
          : false

  // Compute status
  const hasStatus = !!item.href && !isClientSide

  const serviceStatus: ServiceStatus = editMode
    ? { state: "unknown" }
    : isEffectivelyOffline
      ? { state: "unreachable", reason: "You're offline" }
      : serviceError
        ? {
            state: "error",
            reason: serviceError.message || "Failed to fetch service data",
          }
        : pingError
          ? {
              state: "error",
              reason: pingError.message || "Failed to ping URL",
            }
          : pingStatus
            ? pingStatus
            : cachedPingStatus
              ? cachedPingStatus
              : effectiveData
                ? dataToStatus(effectiveData)
                : { state: "unknown" }

  return {
    effectiveData,
    effectiveLoading,
    serviceStatus,
    hasStatus,
    isClientSide,
  }
}
