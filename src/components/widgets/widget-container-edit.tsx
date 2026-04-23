/**
 * Client-only widget container for edit mode.
 * Wraps EditableStatGrid for drag-to-reorder functionality.
 *
 * This is a separate client component because edit mode requires:
 * - React hooks (useState, useCallback)
 * - @dnd-kit drag-and-drop (client-only library)
 *
 * Since edit mode is client-only anyway, this separation is clean and
 * doesn't affect SSR (view mode widgets render server-side).
 */

"use client";

import { useCallback } from "react";
import { EditableStatGrid } from "@/components/dashboard/item/editable-stat-grid";
import type { WidgetPayload } from "@/lib/adapters/widget-types";
import type { StatCardOrder } from "@/hooks/use-stat-card-order";
import type { StatDisplayMode } from "@/lib/types";
import { updateStatCardOrder } from "@/actions/stat-cards";

interface WidgetContainerEditProps {
  payload: WidgetPayload;
  statDisplayMode?: StatDisplayMode;
  statCardOrder?: StatCardOrder | null;
  itemId: string;
}

export function WidgetContainerEdit({
  payload,
  statDisplayMode = "label",
  statCardOrder = null,
  itemId,
}: WidgetContainerEditProps) {
  const handleOrderChange = useCallback(
    (order: StatCardOrder | null) => {
      if (order) {
        updateStatCardOrder(itemId, order).catch(console.error);
      } else {
        updateStatCardOrder(itemId, null).catch(console.error);
      }
    },
    [itemId]
  );

  return (
    <EditableStatGrid
      items={payload.stats}
      order={statCardOrder}
      onOrderChange={handleOrderChange}
      displayMode={statDisplayMode}
    />
  );
}
