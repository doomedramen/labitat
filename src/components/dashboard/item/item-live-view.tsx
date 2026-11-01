"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getService } from "@/lib/adapters";
import { dataToStatus, type ServiceStatus } from "@/lib/adapters/types";
import type { ItemRow } from "@/lib/types";
import { useItemLive } from "@/components/dashboard/use-item-live";
import { WidgetRenderer } from "./widget-renderer";
import { formatAge, formatAgeVerbose } from "@/lib/utils/age";
import styles from "./service-card.module.css";

const STATUS_LABELS: Record<ServiceStatus["state"], string> = {
  healthy: "Healthy",
  reachable: "Reachable",
  unknown: "Awaiting status",
  degraded: "Needs attention",
  unreachable: "Unreachable",
  slow: "Slow response",
  error: "Connection error",
};

export function ItemLiveView({ item }: { item: ItemRow }) {
  const live = useItemLive(item.id);
  const serviceDef = item.serviceType ? getService(item.serviceType) : null;
  const isClientSide = serviceDef?.clientSide ?? false;
  const hasStatus = (!!item.href || !!item.serviceType) && !isClientSide;
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    if (!hasStatus) return;
    setNow(Date.now());
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [hasStatus]);

  const serviceStatus: ServiceStatus = useMemo(() => {
    const widgetStatus = live?.widgetData ? dataToStatus(live.widgetData) : null;
    // The web UI being reachable must not hide an adapter API failure.
    if (widgetStatus?.state === "error" || widgetStatus?.state === "degraded") return widgetStatus;
    return live?.pingStatus ?? widgetStatus ?? { state: "unknown" };
  }, [live?.pingStatus, live?.widgetData]);
  const pollingMs = item.pollingMs ?? serviceDef?.defaultPollingMs ?? 30000;
  const ageMs =
    now !== null && live?.lastFetchedAt != null ? Math.max(0, now - live.lastFetchedAt) : null;
  const cached =
    !!live &&
    live.lastFetchedAt !== null &&
    (live.itemLastUpdateAt === null || live.freshness === "stale");
  const reason = "reason" in serviceStatus ? serviceStatus.reason : null;
  const problem = ["error", "unreachable", "degraded", "slow"].includes(serviceStatus.state);
  const statusLabel = cached
    ? problem
      ? `Cached · ${STATUS_LABELS[serviceStatus.state]}`
      : "Cached data"
    : STATUS_LABELS[serviceStatus.state];

  return (
    <>
      <div className={styles.body}>
        <WidgetRenderer
          serviceDef={serviceDef ?? null}
          effectiveData={live?.widgetData ?? null}
          isClientSide={isClientSide}
          editMode={false}
          item={item}
        />
        {!live?.widgetData && serviceDef && !isClientSide && (
          <p className="py-2 text-xs text-muted-foreground">Waiting for the first update…</p>
        )}
      </div>
      {hasStatus && (
        <footer className={styles.footer}>
          <details className={styles.details}>
            <summary aria-label={`${statusLabel}. Show status details for ${item.label}`}>
              <span
                className={styles.statusDot}
                data-state={cached && !problem ? "unknown" : serviceStatus.state}
                aria-hidden="true"
              />
              <span className={styles.statusLabel}>{statusLabel}</span>
              <span className="tabular-nums">
                {ageMs === null
                  ? "No update yet"
                  : ageMs < 10000
                    ? "Just updated"
                    : `${formatAge(ageMs)} ago`}
              </span>
              <ChevronDown size={12} className={styles.chevron} aria-hidden="true" />
            </summary>
            <div className={styles.detailContent}>
              {reason && <p>{reason}</p>}
              <p>
                {ageMs !== null
                  ? `Last observation ${formatAgeVerbose(ageMs)}.`
                  : "No observation received yet."}
              </p>
              <p>Checks every {pollingMs / 1000} seconds.</p>
              {cached && <p>Showing saved data while waiting for a fresh update.</p>}
            </div>
          </details>
        </footer>
      )}
    </>
  );
}
