import { cn } from "@/lib/utils";
import { getService } from "@/lib/adapters";
import type { ItemWithCache } from "@/lib/types";
import { ItemIcon } from "./item-icon";
import type { ServiceData } from "@/lib/adapters/types";
import { ItemCardLive } from "./item-card-live";
import { ItemStatusDot } from "./item-status-dot";

interface ItemCardProps {
  item: ItemWithCache;
  editMode: boolean;
  onEdit?: (item: ItemWithCache) => void;
  onDeleted?: (itemId: string) => void;
}

/**
 * Server-rendered ItemCard shell (icon, title, link).
 * Delegates widget rendering to ItemCardLive for SSE updates.
 */
export function ItemCard({ item, editMode }: ItemCardProps) {
  const serviceDef = item.serviceType ? getService(item.serviceType) : null;
  const isClientSide = serviceDef?.clientSide ?? false;

  // Use cached data for SSR (only if not clientSide-only service)
  const effectiveData = !editMode && !isClientSide ? item.cachedWidgetData : null;

  return (
    <div
      className={cn(
        "group/item relative overflow-hidden rounded-xl bg-card transition-all duration-300 ease-in-out",
        editMode ? "border border-ring/50" : "border border-border/50",
        !editMode &&
          "transform hover:scale-[1.02] hover:border-border/80 hover:shadow-lg active:scale-[0.98]",
        !editMode && item.href && "cursor-pointer",
      )}
    >
      {!editMode && item.href ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={item.label || item.href}
          className="block"
        >
          <ItemCardContent
            item={item}
            editMode={editMode}
            serviceDef={serviceDef}
            effectiveData={effectiveData}
            isClientSide={isClientSide}
          />
        </a>
      ) : (
        <ItemCardContent
          item={item}
          editMode={editMode}
          serviceDef={serviceDef}
          effectiveData={effectiveData}
          isClientSide={isClientSide}
        />
      )}
    </div>
  );
}

function ItemCardContent({
  item,
  editMode,
  serviceDef,
  effectiveData,
  isClientSide,
}: {
  item: ItemWithCache;
  editMode: boolean;
  serviceDef: ReturnType<typeof getService> | null;
  effectiveData: ReturnType<typeof getService> extends null ? null : unknown;
  isClientSide: boolean;
}) {
  return (
    <div
      className={cn(
        "relative",
        editMode ? "px-3 pt-6 pb-2.5" : item.cleanMode ? "p-2" : "px-3 py-2.5",
      )}
      data-testid="item-card"
      data-item-id={item.id}
    >
      <ItemStatusDot item={item} editMode={editMode} />

      {(!item.cleanMode || editMode) && (
        <div className="flex items-center gap-3">
          <div className="transition-transform duration-300 group-hover/item:scale-105">
            <ItemIcon
              iconUrl={item.iconUrl}
              label={item.label}
              serviceIcon={serviceDef?.icon ?? null}
            />
          </div>
          <div className="min-w-0 flex-1 pr-4">
            <p className="truncate text-sm leading-snug font-medium">
              {editMode ? item.label || serviceDef?.name || item.href : item.label}
            </p>
            {editMode && (
              <div className="mt-0.5 flex flex-col text-xs text-muted-foreground">
                {serviceDef && <span>{serviceDef.name}</span>}
                {item.href && <span className="truncate">{item.href}</span>}
                <span>
                  {(item.pollingMs ?? serviceDef?.defaultPollingMs ?? 30_000) / 1000}
                  s poll
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Client-side widget renderer for SSE updates */}
      <ItemCardLive
        item={item}
        serviceDef={serviceDef ?? null}
        isClientSide={isClientSide}
        editMode={editMode}
        ssrData={effectiveData as ServiceData | null}
      />
    </div>
  );
}

export function ItemCardDragPreview({ item }: { item: ItemWithCache }) {
  const serviceDef = item.serviceType ? getService(item.serviceType) : null;

  return (
    <div className="flex min-h-[3.25rem] items-center gap-3 rounded-xl bg-popover/90 px-3 py-2.5 shadow-lg ring-2 ring-ring backdrop-blur-sm">
      <ItemIcon iconUrl={item.iconUrl} label={item.label} serviceIcon={serviceDef?.icon ?? null} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-snug font-medium">{item.label}</p>
        {item.serviceType && (
          <p className="truncate text-xs text-muted-foreground">
            {serviceDef?.name || item.serviceType}
          </p>
        )}
      </div>
    </div>
  );
}
