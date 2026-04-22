"use client";

import { useItemData } from "@/hooks/use-item-data";
import type { ItemWithCache } from "@/lib/types";
import { BlockLinkPropagation } from "./block-link-propagation";
import { StatusDot } from "./status-dot";
import { getService } from "@/lib/adapters";

export function ItemStatusDot({ item, editMode }: { item: ItemWithCache; editMode: boolean }) {
  const { hasStatus, serviceStatus, isCached } = useItemData({ editMode, item });

  if (editMode || !hasStatus || item.cleanMode) return null;

  // Get polling interval: item setting > adapter default > 30s fallback
  const adapter = item.serviceType ? getService(item.serviceType) : null;
  const pollingMs = item.pollingMs ?? adapter?.defaultPollingMs ?? 30000;

  return (
    <BlockLinkPropagation className="absolute top-3 right-3 transition-all duration-300 group-hover/item:scale-110">
      <StatusDot itemId={item.id} status={serviceStatus} pollingMs={pollingMs} />
    </BlockLinkPropagation>
  );
}
