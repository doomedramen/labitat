import { cn } from "@/lib/utils";
import type { GroupWithItems } from "@/lib/types";
import { ItemCard } from "./item/item-card";
import { Folder } from "lucide-react";

/**
 * Server-only GroupCard for view mode.
 * For edit mode, use GroupCardDummy instead.
 */
export function GroupCard({ group }: { group: GroupWithItems }) {
  return (
    <section className={cn("group/group relative", "rounded-2xl", "transition-all duration-300")}>
      {/* Group header */}
      <header className={cn("mb-3 flex items-center gap-2 px-1", "transition-all duration-200")}>
        {/* Group icon/indicator */}
        <div
          className={cn(
            "flex h-5 w-5 items-center justify-center rounded-md",
            "bg-gradient-to-br from-muted/80 to-muted/40",
            "text-muted-foreground/70",
            "transition-all duration-200",
            "group-hover/group:from-muted group-hover/group:to-muted/60",
            "group-hover/group:text-muted-foreground",
          )}
        >
          <Folder className="h-3 w-3" />
        </div>

        {/* Group title */}
        <h2
          className={cn(
            "flex-1 text-sm font-semibold",
            "text-muted-foreground/80",
            "transition-all duration-200",
            "select-none",
            "group-hover/group:text-foreground",
          )}
        >
          {group.name}
        </h2>
      </header>

      {/* Items grid */}
      <div
        className={cn(
          "grid items-start gap-3",
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        )}
      >
        {group.items.map((item) => (
          <ItemCard key={item.id} item={item} />
        ))}
      </div>
    </section>
  );
}
