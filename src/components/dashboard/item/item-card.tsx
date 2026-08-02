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
        "group/item relative flex flex-col overflow-hidden rounded-xl border border-border/50 bg-card",
        "shadow-xs",
        "transition-[transform,box-shadow,border-color,background-color] duration-200 ease-out",
        "hover:-translate-y-0.5 hover:border-border hover:bg-card/95 hover:shadow-lg",
        "active:translate-y-0 active:scale-[0.995]",
        item.href && "cursor-pointer",
      )}
    >
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
      className="relative flex flex-col gap-3 px-4 py-3.5"
      data-testid="item-card"
      data-item-id={item.id}
    >
      <div className="flex min-w-0 items-center gap-3">
        <div className="shrink-0 transition-transform duration-200 ease-out group-hover/item:scale-[1.04]">
          <ItemIcon
            iconUrl={item.iconUrl}
            label={item.label}
            serviceIcon={serviceDef?.icon ?? null}
          />
        </div>

        <h3
          className={cn(
            "min-w-0 flex-1 truncate text-sm leading-tight font-semibold tracking-[-0.01em]",
            "text-card-foreground/90 transition-colors duration-200",
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
