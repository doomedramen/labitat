"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import type { ServiceData } from "@/lib/adapters/types"
import type { ServiceDefinition } from "@/lib/adapters/types"
import type { ItemRow } from "@/lib/types"
import { WidgetDisplayProvider } from "./widget-display-context"
import type { StatCardOrder } from "@/hooks/use-stat-card-order"

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
  const Widget = serviceDef?.Widget

  // Show widget if we have data (even with warnings)
  const hasWidget =
    !editMode && Widget && serviceDef && (isClientSide || effectiveData)

  const showWidgetSkeleton =
    !editMode && effectiveLoading && !isClientSide && !effectiveData

  const widgetProps =
    isClientSide && serviceDef
      ? {
          ...effectiveData,
          config: serviceDef.configFields.reduce(
            (acc, field) => {
              if (effectiveData?.[field.key] !== undefined) {
                acc[field.key] = effectiveData[field.key]
              }
              return acc
            },
            {} as Record<string, unknown>
          ),
        }
      : effectiveData

  // Always render the container to avoid layout jumps
  const isVisible = hasWidget && (effectiveData || !effectiveLoading)

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
      {isVisible && Widget && effectiveData && (
        <WidgetDisplayProvider
          value={{
            statDisplayMode:
              (item.statDisplayMode as "icon" | "label") ?? "label",
            statCardOrder: (item.statCardOrder as StatCardOrder | null) ?? null,
            editMode,
            itemId: item.id,
          }}
        >
          <Widget {...(widgetProps as Record<string, unknown>)} />
        </WidgetDisplayProvider>
      )}
    </div>
  )
}
