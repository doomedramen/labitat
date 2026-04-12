"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"
import { WidgetContainer } from "@/components/widgets"
import type { ServiceData } from "@/lib/adapters/types"
import type { ServiceDefinition } from "@/lib/adapters/types"
import type { ItemRow } from "@/lib/types"
import { WidgetDisplayProvider } from "./widget-display-context"
import { parseStatCardOrder } from "@/hooks/use-stat-card-order"

interface WidgetRendererProps {
  serviceDef: ServiceDefinition | null
  effectiveData: ServiceData | null
  isClientSide: boolean
  editMode: boolean
  cleanMode?: boolean
  item: ItemRow
}

export function WidgetRenderer({
  serviceDef,
  effectiveData,
  isClientSide,
  editMode,
  cleanMode,
  item,
}: WidgetRendererProps) {
  // Custom widget takes precedence, otherwise use toPayload
  const hasCustomWidget =
    serviceDef?.renderWidget && (isClientSide || effectiveData)

  // Compute payload once and reuse
  const payload = useMemo(
    () =>
      effectiveData && serviceDef?.toPayload
        ? serviceDef.toPayload(effectiveData)
        : null,
    [effectiveData, serviceDef]
  )

  const hasPayload = !!payload && !hasCustomWidget

  // Memoize context value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      statDisplayMode: (item.statDisplayMode as "icon" | "label") ?? "label",
      statCardOrder: parseStatCardOrder(item.statCardOrder),
      editMode,
      itemId: item.id,
      defaultActiveIds: payload?.defaultActiveIds,
    }),
    [item.statDisplayMode, item.statCardOrder, editMode, item.id, payload]
  )

  if (!(hasCustomWidget || hasPayload) || !effectiveData || !serviceDef) {
    return <div className={cn(cleanMode ? "" : "mt-2")} />
  }

  return (
    <div className={cn(cleanMode ? "" : "mt-2")}>
      <WidgetDisplayProvider value={contextValue}>
        {hasCustomWidget && serviceDef.renderWidget ? (
          <serviceDef.renderWidget
            {...(effectiveData as Record<string, unknown>)}
          />
        ) : hasPayload && payload ? (
          <WidgetContainer payload={payload} />
        ) : null}
      </WidgetDisplayProvider>
    </div>
  )
}
