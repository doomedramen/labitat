"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import { WidgetContainer } from "@/components/widgets"
import type { ServiceData } from "@/lib/adapters/types"
import type { ServiceDefinition } from "@/lib/adapters/types"
import type { ItemRow } from "@/lib/types"
import { WidgetDisplayProvider } from "./widget-display-context"
import type { StatCardOrder } from "@/hooks/use-stat-card-order"

function parseStatCardOrder(value: unknown): StatCardOrder | null {
  if (
    value &&
    typeof value === "object" &&
    "active" in value &&
    "unused" in value &&
    Array.isArray((value as StatCardOrder).active) &&
    Array.isArray((value as StatCardOrder).unused)
  ) {
    return value as StatCardOrder
  }
  return null
}

interface WidgetRendererProps {
  serviceDef: ServiceDefinition | null
  effectiveData: ServiceData | null
  effectiveLoading: boolean
  isClientSide: boolean
  editMode: boolean
  cleanMode?: boolean
  item: ItemRow
}

export function WidgetRenderer({
  serviceDef,
  effectiveData,
  effectiveLoading,
  isClientSide,
  editMode,
  cleanMode,
  item,
}: WidgetRendererProps) {
  // Custom widget takes precedence, otherwise use toPayload
  const hasCustomWidget =
    serviceDef?.renderWidget && (isClientSide || effectiveData)
  const hasPayload =
    serviceDef?.toPayload && effectiveData && !hasCustomWidget

  const showWidgetSkeleton =
    !editMode && effectiveLoading && !isClientSide && !effectiveData

  const isVisible = (hasCustomWidget || hasPayload) && (effectiveData || !effectiveLoading)

  return (
    <div
      className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        cleanMode ? "" : "mt-2",
        isVisible ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
      )}
    >
      {showWidgetSkeleton && (
        <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[52px] rounded-md" />
          ))}
        </div>
      )}
      {isVisible && effectiveData && serviceDef && (
        <WidgetDisplayProvider
          value={{
            statDisplayMode:
              (item.statDisplayMode as "icon" | "label") ?? "label",
            statCardOrder: parseStatCardOrder(item.statCardOrder),
            editMode,
            itemId: item.id,
          }}
        >
          {hasCustomWidget && serviceDef.renderWidget ? (
            <serviceDef.renderWidget {...(effectiveData as Record<string, unknown>)} />
          ) : hasPayload && serviceDef.toPayload ? (
            <WidgetContainer payload={serviceDef.toPayload(effectiveData)} />
          ) : null}
        </WidgetDisplayProvider>
      )}
    </div>
  )
}
