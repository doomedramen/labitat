"use client";

import { useItemData } from "@/hooks/use-item-data";
import { WidgetRenderer } from "./widget-renderer";
import type { ItemWithCache } from "@/lib/types";
import type { ServiceDefinition, ServiceData } from "@/lib/adapters/types";

interface ItemCardLiveProps {
  item: ItemWithCache;
  serviceDef: ServiceDefinition | null;
  isClientSide: boolean;
  editMode: boolean;
  ssrData: ServiceData | null;
}

/**
 * Client-side widget renderer that subscribes to SSE live data.
 * Falls back to SSR data until the first SSE update arrives.
 */
export function ItemCardLive({
  item,
  serviceDef,
  isClientSide,
  editMode,
  ssrData,
}: ItemCardLiveProps) {
  // Subscribe to SSE live data
  const { effectiveData: liveData } = useItemData({ editMode, item });

  // Use live SSE data if available, otherwise fall back to SSR data
  const effectiveData = liveData ?? ssrData;

  // Don't render anything if no data
  if (!effectiveData) {
    return null;
  }

  return (
    <WidgetRenderer
      serviceDef={serviceDef ?? null}
      effectiveData={effectiveData}
      isClientSide={isClientSide}
      editMode={editMode}
      cleanMode={item.cleanMode ?? undefined}
      item={item}
    />
  );
}
