"use client"

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
  const hasPayload = serviceDef?.toPayload && effectiveData && !hasCustomWidget

  return (
    <div className={cn(cleanMode ? "" : "mt-2")}>
      {(hasCustomWidget || hasPayload) && effectiveData && serviceDef && (
        <WidgetDisplayProvider
          value={{
            statDisplayMode:
              (item.statDisplayMode as "icon" | "label") ?? "label",
            statCardOrder: parseStatCardOrder(item.statCardOrder),
            editMode,
            itemId: item.id,
            defaultActiveIds:
              serviceDef.toPayload?.(effectiveData).defaultActiveIds,
          }}
        >
          {hasCustomWidget && serviceDef.renderWidget ? (
            <serviceDef.renderWidget
              {...(effectiveData as Record<string, unknown>)}
            />
          ) : hasPayload && serviceDef.toPayload ? (
            <WidgetContainer payload={serviceDef.toPayload(effectiveData)} />
          ) : null}
        </WidgetDisplayProvider>
      )}
    </div>
  )
}
