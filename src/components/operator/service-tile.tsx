"use client";
import { memo, useMemo, type CSSProperties } from "react";
import { ArrowUpRight, ChevronRight } from "lucide-react";
import { getService } from "@/lib/adapters";
import { getServicePresentation, compactMetric } from "@/lib/service-presentation";
import { resolveStatCardLayout, parseStatCardOrder } from "@/lib/stat-card-layout";
import { serviceHealth } from "@/lib/service-health";
import type { ItemRow } from "@/lib/types";
import { useItemLive } from "@/components/dashboard/use-item-live";
import { useVisibleClock } from "@/hooks/use-visible-clock";
import { ItemIcon } from "@/components/dashboard/item/item-icon";
import styles from "./operator.module.css";
export type HealthSummary = { attention: boolean; stale: boolean };
export const ServiceTile = memo(function ServiceTile({
  item,
  onDetails,
  arranging = false,
  initialNow = 0,
}: {
  item: ItemRow;
  onDetails: (id: string) => void;
  arranging?: boolean;
  initialNow?: number;
}) {
  const live = useItemLive(item.id);
  const now = useVisibleClock();
  const service = item.serviceType ? getService(item.serviceType) : null;
  const health = serviceHealth(item, live, now ?? initialNow, service?.clientSide);
  const presentation = useMemo(
    () => getServicePresentation(service, live?.widgetData ?? null),
    [service, live?.widgetData],
  );
  const metrics = useMemo(
    () =>
      resolveStatCardLayout(
        presentation.metrics,
        parseStatCardOrder(item.statCardOrder),
        presentation.defaultActiveIds,
      ).activeItems.slice(0, 4),
    [presentation, item.statCardOrder],
  );
  const label = item.label || service?.name || "Service";
  const reason =
    health.reason ||
    (presentation.unavailable && item.serviceType && presentation.detailKind === "standard"
      ? "Data unavailable"
      : null);
  return (
    <article
      className={styles.tile}
      data-testid="item-card"
      data-layout={metrics.length ? "metrics" : "launcher"}
      data-launch={item.href && !arranging ? true : undefined}
      data-has-reason={!!reason || undefined}
      data-item-id={item.id}
      data-attention={health.attention || undefined}
      data-severity={health.attention ? health.tone : undefined}
      data-stale={health.stale || undefined}
    >
      <div className={styles.tileHeader}>
        <span className={styles.icon} aria-hidden="true">
          <ItemIcon iconUrl={item.iconUrl} label={label} serviceIcon={service?.icon ?? null} />
        </span>
        <div className={styles.identity}>
          {item.href && !arranging ? (
            <a
              className={styles.serviceName}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${label} (opens in a new tab)`}
            >
              <span className={styles.nameText}>{label}</span>
              <ArrowUpRight size={12} aria-hidden="true" />
            </a>
          ) : (
            <h3 className={styles.serviceName}>{label}</h3>
          )}
        </div>
        <span
          className={styles.healthDot}
          data-state={
            health.attention
              ? health.tone
              : health.stale
                ? "stale"
                : health.label === "Healthy"
                  ? "healthy"
                  : "unknown"
          }
          aria-label={health.label}
          title={health.label}
          role="img"
        />
      </div>
      <button
        type="button"
        data-details-for={item.id}
        className={styles.inspect}
        onClick={() => onDetails(item.id)}
        aria-label={`Inspect ${label}`}
      >
        {metrics.length ? (
          <span
            className={styles.metrics}
            data-count={metrics.length}
            style={{ "--metric-count": metrics.length } as CSSProperties}
          >
            {metrics.map((metric) => (
              <span className={styles.metric} key={metric.id}>
                <span className={styles.metricValue} title={metric.displayValue}>
                  {compactMetric(metric)}
                </span>
                <span className={styles.metricLabel} title={metric.label}>
                  {metric.label}
                </span>
              </span>
            ))}
          </span>
        ) : null}
        <ChevronRight className={styles.inspectChevron} size={12} aria-hidden="true" />
      </button>
      {reason && (
        <p className={styles.tileReason} title={reason}>
          {reason}
        </p>
      )}
    </article>
  );
});
