"use client"

import { createContext, useContext } from "react"
import type { StatDisplayMode } from "@/lib/types"
import type { StatCardOrder } from "@/hooks/use-stat-card-order"

export interface WidgetDisplaySettings {
  /** Whether stat cards should show icons or labels */
  statDisplayMode: StatDisplayMode
  /** Custom order of stat card IDs (null = default order, all active) */
  statCardOrder: StatCardOrder | null
  /** Whether DnD reordering is enabled (edit mode) */
  editMode: boolean
  /** Item ID for persistence */
  itemId: string
  /** Called whenever the stat card order changes (e.g. drag in dialog) */
  onOrderChange?: (order: StatCardOrder | null) => void
}

const WidgetDisplayContext = createContext<WidgetDisplaySettings | null>(null)

export function WidgetDisplayProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: WidgetDisplaySettings
}) {
  return (
    <WidgetDisplayContext.Provider value={value}>
      {children}
    </WidgetDisplayContext.Provider>
  )
}

export function useWidgetDisplay(): WidgetDisplaySettings | null {
  return useContext(WidgetDisplayContext)
}
