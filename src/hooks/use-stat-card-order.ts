"use client";

import { useCallback, useMemo } from "react";
import type { StatItem } from "@/components/widgets";
import { updateStatCardOrder } from "@/actions/stat-cards";

import { resolveStatCardLayout, type StatCardOrder } from "@/lib/stat-card-layout";
export { parseStatCardOrder, type StatCardOrder } from "@/lib/stat-card-layout";

/**
 * Hook for managing stat card order within a widget grid.
 * Handles reordering, moving to/from unused, and persistence.
 */
export function useStatCardOrder(
  itemId: string,
  allItems: StatItem[],
  storedOrder: StatCardOrder | null,
  defaultActiveIds?: string[],
) {
  const { activeItems, unusedItems } = useMemo(
    () => resolveStatCardLayout(allItems, storedOrder, defaultActiveIds),
    [allItems, storedOrder, defaultActiveIds],
  );

  const persist = useCallback(
    async (active: string[], unused: string[]) => {
      await updateStatCardOrder(itemId, { active, unused });
    },
    [itemId],
  );

  const handleReorder = useCallback(
    (active: StatItem[], unused: StatItem[]) => {
      persist(
        active.map((i) => i.id),
        unused.map((i) => i.id),
      ).catch(console.error);
    },
    [persist],
  );

  const moveBetweenLists = useCallback(
    (movedId: string, from: "active" | "unused", active: StatItem[], unused: StatItem[]) => {
      if (from === "active") {
        const item = active.find((i) => i.id === movedId);
        if (!item) return;
        const newActive = active.filter((i) => i.id !== movedId);
        const newUnused = [...unused, item];
        handleReorder(newActive, newUnused);
      } else {
        const item = unused.find((i) => i.id === movedId);
        if (!item) return;
        const newUnused = unused.filter((i) => i.id !== movedId);
        const newActive = [...active, item];
        handleReorder(newActive, newUnused);
      }
    },
    [handleReorder],
  );

  const resetOrder = useCallback(async () => {
    await updateStatCardOrder(itemId, null);
  }, [itemId]);

  return {
    activeItems,
    unusedItems,
    handleReorder,
    moveBetweenLists,
    resetOrder,
  };
}
