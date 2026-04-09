"use client"

import { useCallback, useMemo } from "react"
import type { StatItem } from "@/components/widgets"
import { updateStatCardOrder } from "@/actions/stat-cards"

type UniqueIdentifier = string | number

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
  storedOrder: StatCardOrder | null
) {
  // Build active and unused item lists
  const { activeItems, unusedItems } = useMemo(() => {
    const itemMap = new Map(allItems.map((item) => [item.id, item]))

    // If no stored order, all items are active in default order
    if (!storedOrder) {
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
  }, [allItems, storedOrder])

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
      )
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
