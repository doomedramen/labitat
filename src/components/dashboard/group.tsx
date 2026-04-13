"use client";

import { cn } from "@/lib/utils";
import type { GroupWithCache } from "@/lib/types";
import { ItemCard } from "./item/item-card";

/**
 * Server-compatible GroupCard.
 * Renders group name and items during SSR.
 * For edit mode, use GroupCardDummy instead.
 */
export function GroupCard({ group, editMode }: { group: GroupWithCache; editMode: boolean }) {
  return (
    <div className="group/group relative">
      {/* Group header */}
      <div className="mb-2 flex items-center gap-2">
        <h2 className="flex-1 text-sm font-medium text-muted-foreground transition-colors duration-200 select-none group-hover/group:text-foreground">
          {group.name}
        </h2>
      </div>

      {/* Items grid */}
      <div
        className={cn(
          "grid items-start gap-3",
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        )}
      >
        {group.items.map((item) => (
          <ItemCard key={item.id} item={item} editMode={editMode} />
        ))}
      </div>
    </div>
  );
}
