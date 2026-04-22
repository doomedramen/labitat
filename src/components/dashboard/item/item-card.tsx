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
        // Base card styles
        "group/item relative flex flex-col",
        "rounded-xl bg-card",
        // Subtle border with hover enhancement
        "border border-border/40",
        // Smooth transitions
        "transition-all duration-300 ease-out",
        // Edit mode styling
        editMode && "border-ring/50",
        // Hover effects (only in non-edit mode)
        !editMode && [
          "hover:border-border/70 hover:bg-card/95",
          "hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.12),0_4px_12px_-4px_rgba(0,0,0,0.08)]",
          "hover:-translate-y-0.5",
          "dark:hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.35),0_4px_12px_-4px_rgba(0,0,0,0.25)]",
          "active:translate-y-0 active:scale-[0.995]",
        ],
        // Cursor and overflow
        !editMode && item.href && "cursor-pointer",
        "overflow-hidden",
      )}
    >
      {/* Subtle gradient overlay on hover */}
      <div
        className={cn(
          "pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300",
          "bg-gradient-to-b from-primary/[0.02] to-transparent",
          "group-hover/item:opacity-100",
        )}
      />

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
        "relative flex flex-col",
        editMode ? "px-4 pt-6 pb-3" : item.cleanMode ? "p-3" : "px-4 py-3.5",
      )}
      data-testid="item-card"
      data-item-id={item.id}
    >
      <ItemStatusDot item={item} editMode={editMode} />

      {(!item.cleanMode || editMode) && (
        <div className="flex items-center gap-3.5">
          {/* Icon container with enhanced styling */}
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

          {/* Title and metadata */}
          <div className="min-w-0 flex-1 pr-5">
            <h3
              className={cn(
                "truncate text-sm leading-tight font-semibold",
                "text-card-foreground/90",
                "transition-colors duration-200",
                "group-hover/item:text-foreground",
              )}
            >
              {editMode ? item.label || serviceDef?.name || item.href : item.label}
            </h3>

            {editMode && (
              <div className="mt-1.5 flex flex-col gap-0.5">
                {serviceDef && (
                  <span className="text-xs font-medium text-primary/80">{serviceDef.name}</span>
                )}
                {item.href && (
                  <span className="truncate text-xs text-muted-foreground/70">{item.href}</span>
                )}
                <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60">
                  <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/40" />
                  {(item.pollingMs ?? serviceDef?.defaultPollingMs ?? 30_000) / 1000}s refresh
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
