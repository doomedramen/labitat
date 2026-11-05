"use client";
import { memo, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
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
  const [statusOpen, setStatusOpen] = useState(false);
  const statusRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!statusOpen) return;
    const dismiss = (event: PointerEvent) => {
      if (event.target instanceof Node && !statusRef.current?.contains(event.target)) {
        if (
          document.activeElement instanceof HTMLElement &&
          statusRef.current?.contains(document.activeElement)
        ) {
          document.activeElement.blur();
        }
        setStatusOpen(false);
      }
    };
    document.addEventListener("pointerdown", dismiss);
    return () => document.removeEventListener("pointerdown", dismiss);
  }, [statusOpen]);
  const statusId = useId();
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
      {item.href && !arranging && (
        <a
          className={styles.tileLaunch}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} (opens in a new tab)`}
        />
      )}
      <div className={styles.tileHeader}>
        <span className={styles.icon} aria-hidden="true">
          <ItemIcon iconUrl={item.iconUrl} label={label} serviceIcon={service?.icon ?? null} />
        </span>
        <div className={styles.identity}>
          <h3 className={styles.serviceName}>
            <span className={styles.nameText}>{label}</span>
            {item.href && !arranging && <ArrowUpRight size={12} aria-hidden="true" />}
          </h3>
        </div>
        <div ref={statusRef} className={styles.statusControl} data-open={statusOpen || undefined}>
          <button
            type="button"
            className={styles.statusTrigger}
            aria-label={`Status for ${label}: ${health.label}`}
            aria-describedby={statusId}
            data-details-for={!metrics.length && item.href && !arranging ? item.id : undefined}
            onClick={() => setStatusOpen((open) => !open)}
            onBlur={(event) => {
              if (!event.currentTarget.parentElement?.contains(event.relatedTarget))
                setStatusOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                setStatusOpen(false);
                event.currentTarget.blur();
              }
            }}
          >
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
            />
          </button>
          <span className={styles.statusTooltip}>
            <span id={statusId} role="tooltip">
              {health.label}
              {reason ? ` · ${reason}` : ""}
              {health.attention && health.stale ? " · stale" : ""}
            </span>
            {!metrics.length && item.href && !arranging && (
              <button
                type="button"
                className={styles.statusDetails}
                onClick={() => {
                  statusRef.current?.querySelector("button")?.focus();
                  setStatusOpen(false);
                  onDetails(item.id);
                }}
              >
                Service details
              </button>
            )}
          </span>
        </div>
      </div>
      {(metrics.length > 0 || !item.href || arranging) && (
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
        </button>
      )}
    </article>
  );
});
