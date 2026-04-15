"use client";

import { useItemData } from "@/hooks/use-item-data";
import type { ItemWithCache } from "@/lib/types";
import { BlockLinkPropagation } from "./block-link-propagation";
import { StatusDot } from "./status-dot";

export function ItemStatusDot({ item, editMode }: { item: ItemWithCache; editMode: boolean }) {
  const { hasStatus, serviceStatus } = useItemData({ editMode, item });

  if (editMode || !hasStatus || item.cleanMode) return null;

  return (
    <BlockLinkPropagation className="absolute top-3 right-3 transition-all duration-300 group-hover/item:scale-110">
      <StatusDot status={serviceStatus} />
    </BlockLinkPropagation>
  );
}
