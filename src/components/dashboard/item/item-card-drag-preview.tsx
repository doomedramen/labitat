"use client";

import { cn } from "@/lib/utils";
import { getService } from "@/lib/adapters";
import type { ItemRow } from "@/lib/types";
import { ItemIcon } from "@/components/dashboard/item/item-icon";

export function ItemCardDragPreview({ item }: { item: ItemRow }) {
  const serviceDef = item.serviceType ? getService(item.serviceType) : null;

  return (
    <div
      className={cn(
        "flex min-h-[3.5rem] items-center gap-3",
        "rounded-xl bg-popover/95 px-4 py-3",
        "shadow-[0_20px_50px_-12px_rgba(0,0,0,0.25)]",
        "ring-2 ring-ring/50",
        "backdrop-blur-md",
        "transform rotate-1 scale-105",
      )}
    >
      <div className="shrink-0">
        <ItemIcon
          iconUrl={item.iconUrl}
          label={item.label}
          serviceIcon={serviceDef?.icon ?? null}
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-foreground">{item.label}</p>
        {item.serviceType && (
          <p className="truncate text-xs text-muted-foreground">
            {serviceDef?.name || item.serviceType}
          </p>
        )}
      </div>
    </div>
  );
}
