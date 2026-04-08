"use client"

import { cn } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"
import type { ServiceData } from "@/lib/adapters/types"
import type { ServiceDefinition } from "@/lib/adapters/types"

// ── WidgetRenderer component ──────────────────────────────────────────────────

interface WidgetRendererProps {
  serviceDef: ServiceDefinition | null
  effectiveData: ServiceData | null
  effectiveLoading: boolean
  isClientSide: boolean
  editMode: boolean
  cleanMode?: boolean
}

export function WidgetRenderer({
  serviceDef,
  effectiveData,
  effectiveLoading,
  isClientSide,
  editMode,
  cleanMode,
}: WidgetRendererProps) {
  const Widget = serviceDef?.Widget

  // Determine if we should show the widget
  const hasWidget =
    !editMode &&
    Widget &&
    serviceDef &&
    (isClientSide || (effectiveData && effectiveData._status !== "error"))

  const showWidgetSkeleton = !editMode && effectiveLoading && !isClientSide

  // For client-side widgets, pass the initial config data
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

  // Always render the container to avoid layout jumps, use opacity/visibility for transitions
  const isVisible = hasWidget && !effectiveLoading

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
      {isVisible && Widget && (
        <Widget {...(widgetProps as Record<string, unknown>)} />
      )}
    </div>
  )
}
