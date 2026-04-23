import { cn } from "@/lib/utils";
import { getService } from "@/lib/adapters";
import type { ItemRow } from "@/lib/types";
import { ItemIcon } from "@/components/dashboard/item/item-icon";
import { ItemLiveView } from "@/components/dashboard/item/item-live-view";

export function ItemCard({ item }: { item: ItemRow }) {
  const serviceDef = item.serviceType ? getService(item.serviceType) : null;

  return (
    <div
      className={cn(
        "group/item relative flex flex-col",
        "rounded-xl bg-card",
        "border border-border/40",
        "transition-all duration-300 ease-out",
        [
          "hover:border-border/70 hover:bg-card/95",
          "hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.12),0_4px_12px_-4px_rgba(0,0,0,0.08)]",
          "hover:-translate-y-0.5",
          "dark:hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.35),0_4px_12px_-4px_rgba(0,0,0,0.25)]",
          "active:translate-y-0 active:scale-[0.995]",
        ],
        item.href && "cursor-pointer",
        "overflow-hidden",
      )}
    >
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
          "bg-gradient-to-b from-primary/[0.02] to-transparent",
          "group-hover/item:opacity-100",
        )}
      />

      {item.href ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label || item.href}
          className="block"
        >
          <ItemCardContent item={item} serviceDef={serviceDef} />
        </a>
      ) : (
        <ItemCardContent item={item} serviceDef={serviceDef} />
      )}
    </div>
  );
}

function ItemCardContent({
  item,
  serviceDef,
}: {
  item: ItemRow;
  serviceDef: ReturnType<typeof getService> | null;
}) {
  return (
    <div
      className={cn("relative flex flex-col px-4 py-3.5 gap-3")}
      data-testid="item-card"
      data-item-id={item.id}
    >
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={cn(
            "shrink-0 transition-transform duration-300 ease-out",
            "group-hover/item:scale-105 group-hover/item:rotate-[2deg]",
          )}
        >
          <ItemIcon
            iconUrl={item.iconUrl}
            label={item.label}
            serviceIcon={serviceDef?.icon ?? null}
          />
        </div>

        <h3
          className={cn(
            "flex-1 min-w-0 truncate text-sm leading-tight font-semibold",
            "text-card-foreground/90",
            "transition-colors duration-200",
            "group-hover/item:text-foreground",
          )}
        >
          {item.label || serviceDef?.name || item.href}
        </h3>
      </div>

      <ItemLiveView item={item} />
    </div>
  );
}
