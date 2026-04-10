"use client"

import { useCallback, useMemo } from "react"
import type { StatItem } from "@/components/widgets"
import { updateStatCardOrder } from "@/actions/stat-cards"

/** Stored order: which stat cards are active vs unused */
export type StatCardOrder = {
  active: string[]
  unused: string[]
}

/**
 * Hook for managing stat card order within a widget grid.
 * Handles reordering, moving to/from unused, and persistence.
 */
export function useStatCardOrder(
  itemId: string,
  allItems: StatItem[],
  storedOrder: StatCardOrder | null,
  defaultActiveIds?: string[]
) {
  // Build active and unused item lists
  const { activeItems, unusedItems } = useMemo(() => {
    const itemMap = new Map(allItems.map((item) => [item.id, item]))

    // If no stored order, use default active IDs if provided
    if (!storedOrder) {
      if (defaultActiveIds && defaultActiveIds.length > 0) {
        const active = defaultActiveIds
          .map((id) => itemMap.get(id))
          .filter((item): item is StatItem => item !== undefined)

        const unused = allItems.filter(
          (item) => !defaultActiveIds.includes(item.id)
        )

        return { activeItems: active, unusedItems: unused }
      }
      // No defaults - all items active
      return { activeItems: allItems, unusedItems: [] as StatItem[] }
    }

    const active = storedOrder.active
      .map((id) => itemMap.get(id))
      .filter((item): item is StatItem => item !== undefined)

    const unused = storedOrder.unused
      .map((id) => itemMap.get(id))
      .filter((item): item is StatItem => item !== undefined)

    // Include any items not in stored order (newly added stats) as active
    const storedIds = new Set([...storedOrder.active, ...storedOrder.unused])
    const newItems = allItems.filter((item) => !storedIds.has(item.id))

    return { activeItems: [...active, ...newItems], unusedItems: unused }
  }, [allItems, storedOrder, defaultActiveIds])

  const persist = useCallback(
    async (active: string[], unused: string[]) => {
      await updateStatCardOrder(itemId, { active, unused })
    },
    [itemId]
  )

  const handleReorder = useCallback(
    (active: StatItem[], unused: StatItem[]) => {
      persist(
        active.map((i) => i.id),
        unused.map((i) => i.id)
      ).catch(console.error)
    },
    [persist]
  )

  const moveBetweenLists = useCallback(
    (
      movedId: string,
      from: "active" | "unused",
      active: StatItem[],
      unused: StatItem[]
    ) => {
      if (from === "active") {
        const item = active.find((i) => i.id === movedId)
        if (!item) return
        const newActive = active.filter((i) => i.id !== movedId)
        const newUnused = [...unused, item]
        handleReorder(newActive, newUnused)
      } else {
        const item = unused.find((i) => i.id === movedId)
        if (!item) return
        const newUnused = unused.filter((i) => i.id !== movedId)
        const newActive = [...active, item]
        handleReorder(newActive, newUnused)
      }
    },
    [handleReorder]
  )

  const resetOrder = useCallback(async () => {
    await updateStatCardOrder(itemId, null)
  }, [itemId])

  return {
    activeItems,
    unusedItems,
    handleReorder,
    moveBetweenLists,
    resetOrder,
  }
}
