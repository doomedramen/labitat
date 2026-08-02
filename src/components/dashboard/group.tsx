import { cn } from "@/lib/utils";
import type { GroupWithItems } from "@/lib/types";
import { ItemCard } from "./item/item-card";

/**
 * Server-only GroupCard for view mode.
 * For edit mode, use GroupCardDummy instead.
 */
export function GroupCard({ group }: { group: GroupWithItems }) {
  return (
    <section className="relative">
      <header className="mb-4 flex items-center gap-3 border-b border-border/50 pb-2.5">
        <span className="h-4 w-0.5 rounded-full bg-primary/70" aria-hidden />
        <h2 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-[-0.01em]">
          {group.name}
        </h2>
        <span className="text-xs tabular-nums text-muted-foreground">
          {group.items.length} {group.items.length === 1 ? "item" : "items"}
        </span>
      </header>

      <div
        className={cn(
          "grid items-start gap-3.5",
          "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
        )}
      >
        {group.items.length > 0 ? (
          group.items.map((item) => <ItemCard key={item.id} item={item} />)
        ) : (
          <p className="col-span-full rounded-xl border border-dashed border-border/60 px-4 py-8 text-center text-sm text-muted-foreground">
            No items in this group.
          </p>
        )}
      </div>
    </section>
  );
}
