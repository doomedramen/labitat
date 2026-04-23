import { cn } from "@/lib/utils";
import { getService } from "@/lib/adapters";
import type { ItemWithCache } from "@/lib/types";
import { ItemIcon } from "./item-icon";
import type { ServiceData, ServiceDefinition } from "@/lib/adapters/types";
import { ItemCardLive } from "./item-card-live";
import { StatusPill } from "./status-pill";
import { useItemData } from "@/hooks/use-item-data";
import { useSyncProgress } from "@/hooks/use-sync-progress";
import { formatAge, formatAgeVerbose } from "@/lib/utils/age";
import { WidgetContainer } from "@/components/widgets/widget-container";
import { parseStatCardOrder } from "@/hooks/use-stat-card-order";

interface ItemCardProps {
  item: ItemWithCache;
  editMode: boolean;
  onEdit?: (item: ItemWithCache) => void;
  onDeleted?: (itemId: string) => void;
}

/**
 * Server-rendered ItemCard shell (icon, title, link).
 * Renders widgets from cached data during SSR.
 */
export function ItemCard({ item, editMode }: ItemCardProps) {
  const serviceDef = item.serviceType ? getService(item.serviceType) : null;
  const isClientSide = serviceDef?.clientSide ?? false;

  // Use cached data for SSR widget rendering
  const effectiveData = !editMode ? item.cachedWidgetData : null;

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

function ItemCardHeader({
  item,
  editMode,
  serviceDef,
}: {
  item: ItemWithCache;
  editMode: boolean;
  serviceDef: ReturnType<typeof getService> | null;
}) {
  // Get live data for status pill
  const { hasStatus, serviceStatus, isCached } = useItemData({ editMode, item });

  // Get polling interval: item setting > adapter default > 30s fallback
  const pollingMs = item.pollingMs ?? serviceDef?.defaultPollingMs ?? 30000;

  // Get sync progress for the animated border
  const progress = useSyncProgress(item.id, pollingMs);

  return (
    <div className="flex items-center gap-3 min-w-0">
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

      {/* Title - truncates with ellipsis */}
      <h3
        className={cn(
          "flex-1 min-w-0 truncate text-sm leading-tight font-semibold",
          "text-card-foreground/90",
          "transition-colors duration-200",
          "group-hover/item:text-foreground",
        )}
      >
        {editMode ? item.label || serviceDef?.name || item.href : item.label}
      </h3>

      {/* Status pill - shows age and sync progress */}
      {!editMode && hasStatus && (
        <div className="shrink-0 flex items-center">
          <StatusPill
            label={getStatusLabel(serviceStatus, item.cachedDataAge)}
            progress={progress}
            color={
              serviceStatus.state === "error" || serviceStatus.state === "unreachable"
                ? "#f87171"
                : serviceStatus.state === "slow" || serviceStatus.state === "degraded"
                  ? "#fbbf24"
                  : "#4ade80"
            }
            dotClassName={
              serviceStatus.state === "error" || serviceStatus.state === "unreachable"
                ? "bg-error"
                : serviceStatus.state === "slow" || serviceStatus.state === "degraded"
                  ? "bg-warning"
                  : "bg-success"
            }
            tooltip={getStatusTooltip(serviceStatus, item.cachedDataAge)}
          />
        </div>
      )}

      {/* Edit mode metadata */}
      {editMode && (
        <div className="shrink-0 min-w-0">
          <div className="mt-1.5 flex flex-col gap-0.5">
            {serviceDef && (
              <span className="text-xs font-medium text-primary/80">{serviceDef.name}</span>
            )}
            {item.href && (
              <span className="truncate text-xs text-muted-foreground/70">{item.href}</span>
            )}
            <span className="inline-flex items-center gap-1 text-[11px] text-muted-foreground/60">
              <span className="inline-block h-1 w-1 rounded-full bg-muted-foreground/40" />
              {pollingMs / 1000}s refresh
            </span>
          </div>
        </div>
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
  // Prepare display settings
  const statDisplayMode = (item.statDisplayMode as "icon" | "label") ?? "label";
  const statCardOrder = parseStatCardOrder(item.statCardOrder);

  // Generate widget payload from cached data for SSR
  const ssrPayload =
    !editMode && effectiveData && serviceDef?.toPayload
      ? serviceDef.toPayload(effectiveData as ServiceData)
      : null;

  return (
    <div
      className={cn(
        "relative flex flex-col",
        editMode ? "px-4 pt-6 pb-3 gap-3" : "px-4 py-3.5 gap-3",
      )}
      data-testid="item-card"
      data-item-id={item.id}
    >
      <ItemCardHeader item={item} editMode={editMode} serviceDef={serviceDef} />

      {/*
        Widget rendering for SSR.
        WidgetContainer receives data via props (no Context) so it works during SSR.
        This ensures stat cards are visible in the initial HTML response.
      */}
      {ssrPayload && (
        <WidgetContainer
          payload={ssrPayload}
          statDisplayMode={statDisplayMode}
          statCardOrder={statCardOrder}
          editMode={editMode}
        />
      )}

      {/*
        Client-side widget renderer for:
        - Live SSE data updates (hydrates over SSR content)
        - Client-side-only services
        - Edit mode (drag-and-drop reordering)
      */}
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

// Helper function to get status pill label
function getStatusLabel(status: { state: string }, ageMs: number | null): string {
  const isError = status.state === "error" || status.state === "unreachable";

  // Show error text for error states
  if (isError) {
    return "Error";
  }

  // Show age if we have cached data and it's older than 5 minutes
  const hasData = ageMs !== null;
  const isStale = ageMs !== null && ageMs > 5 * 60 * 1000;

  if (hasData && isStale) {
    return formatAge(ageMs);
  }

  // Empty string for fresh data (just shows dot)
  return "";
}

// Helper function to get status pill tooltip
function getStatusTooltip(
  status: { state: string; reason?: string },
  ageMs: number | null,
): React.ReactNode {
  const statusLabels: Record<string, string> = {
    unknown: "Status unknown",
    healthy: "Healthy",
    degraded: "Degraded",
    reachable: "Reachable",
    unreachable: "Unreachable",
    slow: "Slow response",
    error: "Error",
  };

  const baseLabel = statusLabels[status.state] || statusLabels.unknown;
  const ageText =
    ageMs !== null ? `Updated ${formatAgeVerbose(ageMs)}` : "Waiting for first update...";

  const isProblem =
    status.state === "error" ||
    status.state === "unreachable" ||
    status.state === "degraded" ||
    status.state === "slow";

  return (
    <div className="flex flex-col">
      {status.reason && isProblem ? (
        <>
          <div className="px-3 py-2 bg-destructive/10 text-destructive text-sm font-medium">
            {status.reason}
          </div>
          <div className="h-px bg-border/50" />
        </>
      ) : (
        <div className="px-3 py-2 text-sm font-medium text-foreground">{baseLabel}</div>
      )}
      <div className="px-3 py-2 text-xs text-muted-foreground">{ageText}</div>
    </div>
  );
}
