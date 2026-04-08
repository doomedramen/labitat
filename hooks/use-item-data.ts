"use client"

import { useSyncExternalStore } from "react"
import useSWR, { type SWRConfiguration } from "swr"
import { getWidgetData } from "@/actions/widget-data"
import { pingUrl } from "@/actions/ping"
import type { ItemRow } from "@/lib/types"
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types"
import { dataToStatus } from "@/lib/adapters/types"
import { getService } from "@/lib/adapters"

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

const isClient = typeof window !== "undefined"

function subscribeToOnlineState(callback: () => void) {
  if (!isClient) return () => {}
  window.addEventListener("online", callback)
  window.addEventListener("offline", callback)
  return () => {
    window.removeEventListener("online", callback)
    window.removeEventListener("offline", callback)
  }
}

function getOnlineState() {
  return isClient ? navigator.onLine : true
}

export function useItemData({
  editMode,
  item,
}: UseItemDataOptions): UseItemDataResult {
  const isOnline = useSyncExternalStore(
    subscribeToOnlineState,
    getOnlineState,
    () => true
  )

  const serviceDef = item.serviceType ? getService(item.serviceType) : null
  const pollingMs = item.pollingMs ?? serviceDef?.defaultPollingMs ?? 30_000
  const isClientSide = serviceDef?.clientSide ?? false

  const shouldFetchService = !editMode && item.serviceType && serviceDef
  const shouldPing = !editMode && !item.serviceType && item.href

  const onErrorRetry: SWRConfiguration["onErrorRetry"] = (
    _error,
    _key,
    _config,
    revalidate,
    { retryCount }
  ) => {
    if (!isOnline) return
    if (retryCount >= 5) return
    setTimeout(
      () => revalidate({ retryCount }),
      Math.min(1000 * 2 ** retryCount, pollingMs)
    )
  }

  // SWR key matches the fallback key set in Dashboard from SSR-preloaded data.
  // On first render (SSR + hydration) SWR returns the fallback — no loading flash.
  // After mount, SWR revalidates in the background per pollingMs.
  const {
    data: serviceData,
    isLoading: isServiceLoading,
    error: serviceError,
  } = useSWR<ServiceData | null>(
    shouldFetchService && !isClientSide && isOnline
      ? `widget:${item.id}`
      : null,
    () => getWidgetData(item.id),
    {
      refreshInterval: isOnline ? pollingMs : 0,
      dedupingInterval: pollingMs,
      revalidateOnFocus: false,
      revalidateIfStale: true,
      shouldRetryOnError: isOnline,
      onErrorRetry,
    }
  )

  const {
    data: pingData,
    isLoading: isPingLoading,
    error: pingError,
  } = useSWR<ServiceStatus | null>(
    shouldPing && isOnline ? `ping:${item.id}:${item.href}` : null,
    () => pingUrl(item.href!),
    {
      refreshInterval: isOnline ? pollingMs : 0,
      dedupingInterval: pollingMs,
      revalidateOnFocus: false,
      revalidateIfStale: true,
      shouldRetryOnError: isOnline,
      onErrorRetry,
    }
  )

  const effectiveData = editMode ? null : (serviceData ?? null)

  // isLoading is false when SWR has any data (including SSR fallback), so no flash
  const effectiveLoading = editMode
    ? false
    : !isOnline
      ? false
      : shouldFetchService && !isClientSide
        ? isServiceLoading
        : shouldPing
          ? isPingLoading
          : false

  const hasStatus = !!item.href && !isClientSide

  const serviceStatus: ServiceStatus = editMode
    ? { state: "unknown" }
    : !isOnline
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
          : pingData
            ? pingData
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
