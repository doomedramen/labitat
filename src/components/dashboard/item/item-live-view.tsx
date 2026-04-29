"use client";

import { useMemo } from "react";
import { getService } from "@/lib/adapters";
import { dataToStatus, type ServiceStatus } from "@/lib/adapters/types";
import type { ItemRow } from "@/lib/types";
import { useItemLive } from "@/components/dashboard/use-item-live";
import { StatusDot } from "@/components/dashboard/item/status-dot";
import { WidgetRenderer } from "@/components/dashboard/item/widget-renderer";
import { formatAgeVerbose } from "@/lib/utils/age";

export function ItemLiveView({ item }: { item: ItemRow }) {
  const live = useItemLive(item.id);

  const serviceDef = item.serviceType ? getService(item.serviceType) : null;
  const isClientSide = serviceDef?.clientSide ?? false;

  const hasStatus = (!!item.href || !!item.serviceType) && !isClientSide;

  const serviceStatus: ServiceStatus = useMemo(() => {
    if (live?.pingStatus) return live.pingStatus;
    if (live?.widgetData) return dataToStatus(live.widgetData);
    return { state: "unknown" };
  }, [live?.pingStatus, live?.widgetData]);

  const pollingMs = item.pollingMs ?? serviceDef?.defaultPollingMs ?? 30000;

  const ageMs =
    live?.lastFetchedAt !== null && live?.lastFetchedAt !== undefined
      ? Date.now() - live.lastFetchedAt
      : null;

  const hasCachedSnapshot = live?.itemLastUpdateAt === null && live?.lastFetchedAt !== null;

  return (
    <>
      {hasStatus && (
        <div className="absolute top-3.5 right-4 shrink-0 flex items-center">
          <StatusDot
            itemId={item.id}
            status={serviceStatus}
            cached={hasCachedSnapshot}
            pollingMs={pollingMs}
            tooltip={getStatusTooltip(serviceStatus, ageMs, hasCachedSnapshot)}
          />
        </div>
      )}

      <WidgetRenderer
        serviceDef={serviceDef ?? null}
        effectiveData={live?.widgetData ?? null}
        isClientSide={isClientSide}
        editMode={false}
        item={item}
      />
    </>
  );
}

function getStatusTooltip(
  status: { state: string; reason?: string },
  ageMs: number | null,
  cached = false,
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

  const baseLabel = `${statusLabels[status.state] || statusLabels.unknown}${cached ? " (cached)" : ""}`;
  const ageText =
    ageMs !== null
      ? `${cached ? "Cached" : "Updated"} ${formatAgeVerbose(ageMs)}`
      : cached
        ? "Serving cached data"
        : "";

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
      {ageText ? <div className="px-3 py-2 text-xs text-muted-foreground">{ageText}</div> : null}
    </div>
  );
}
