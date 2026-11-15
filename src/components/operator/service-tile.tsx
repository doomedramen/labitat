"use client";
import { memo, useEffect, useId, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowUpRight } from "lucide-react";
import { getService } from "@/lib/adapters";
import { hasMetricSlots } from "@/lib/dashboard-board";
import { getServicePresentation, compactMetric } from "@/lib/service-presentation";
import { resolveStatCardLayout, parseStatCardOrder, SECONDARY_STATS } from "@/lib/stat-card-layout";
import { serviceHealth } from "@/lib/service-health";
import { formatAge } from "@/lib/utils/age";
import type { ItemRow } from "@/lib/types";
import { useItemLive } from "@/components/dashboard/use-item-live";
import { useVisibleClock } from "@/hooks/use-visible-clock";
import { useStalenessFloor } from "@/hooks/use-staleness-floor";
import { ItemIcon } from "@/components/dashboard/item/item-icon";
import legacy from "./operator.module.css";
import styles from "./tile.module.css";
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
  const [statusBelow, setStatusBelow] = useState(false);
  // Horizontal nudge that keeps the tooltip inside the viewport beside edge cards.
  const [statusShift, setStatusShift] = useState(0);
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
  const placeStatus = () => {
    requestAnimationFrame(() => {
      const control = statusRef.current;
      const popup = control?.querySelector<HTMLElement>("[data-status-popup]");
      if (!control || !popup) return;
      setStatusBelow(control.getBoundingClientRect().top < popup.offsetHeight + 8);
      const rect = popup.getBoundingClientRect();
      if (!rect.width) return;
      const current = parseFloat(popup.style.translate) || 0;
      const left = rect.left - current;
      const right = rect.right - current;
      const margin = 8;
      setStatusShift(
        left < margin
          ? margin - left
          : right > window.innerWidth - margin
            ? window.innerWidth - margin - right
            : 0,
      );
    });
  };
  const statusId = useId();
  const live = useItemLive(item.id);
  const now = useVisibleClock();
  const service = item.serviceType ? getService(item.serviceType) : null;
  const clock = now ?? initialNow;
  const ageFloor = useStalenessFloor();
  const health = serviceHealth(item, live, clock, service?.clientSide, ageFloor);
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
      )
        .activeItems.slice(0, 1 + SECONDARY_STATS)
        .map((metric) => ({ ...metric, compactValue: compactMetric(metric) })),
    [presentation, item.statCardOrder],
  );
  const label = item.label || service?.name || "Service";
  // Structural, never live data: polling must not turn a card into a chip or back.
  const hasMetrics = arranging ? metrics.length > 0 : hasMetricSlots(item);
  const reason =
    health.reason ||
    (presentation.unavailable && item.serviceType && presentation.detailKind === "standard"
      ? "Data unavailable"
      : null);
  const age = live?.lastSuccessAt != null ? Math.max(0, clock - live.lastSuccessAt) : null;
  const ageLabel =
    age === null
      ? item.serviceType && !service?.clientSide
        ? "No data yet"
        : null
      : health.stale
        ? `${formatAge(age)} old`
        : age < 10_000
          ? "Just updated"
          : `${formatAge(age)} ago`;
  const state = health.attention
    ? health.tone
    : health.stale
      ? "stale"
      : health.label === "Healthy"
        ? "healthy"
        : "unknown";
  const tooltip = (
    <span id={statusId} role="tooltip">
      {health.label}
      {reason ? ` · ${reason}` : ""}
      {health.attention && health.stale ? " · stale" : ""}
    </span>
  );
  const attributes = {
    "data-testid": "item-card",
    "data-layout": hasMetrics ? "metrics" : "launcher",
    "data-has-reason": !!reason || undefined,
    "data-item-id": item.id,
    "data-attention": health.attention || undefined,
    "data-severity": health.attention ? health.tone : undefined,
    "data-stale": health.stale || undefined,
    "data-disabled": !item.enabled || undefined,
  };
  const icon = (
    <ItemIcon iconUrl={item.iconUrl} label={label} serviceIcon={service?.icon ?? null} />
  );

  if (arranging)
    return (
      <article className={legacy.tile} {...attributes}>
        <div className={legacy.tileHeader}>
          <span className={legacy.icon} aria-hidden="true">
            {icon}
          </span>
          <div className={legacy.identity}>
            <h3 className={legacy.serviceName}>
              <span className={legacy.nameText}>{label}</span>
            </h3>
          </div>
          <div
            ref={statusRef}
            className={legacy.statusControl}
            data-open={statusOpen || undefined}
            data-below={statusBelow || undefined}
            onPointerEnter={(event) => {
              if (event.pointerType === "mouse") placeStatus();
            }}
          >
            <button
              type="button"
              className={legacy.statusTrigger}
              aria-label={`Status for ${label}: ${health.label}`}
              aria-describedby={statusId}
              aria-expanded={statusOpen}
              onClick={() => {
                setStatusOpen((open) => !open);
                placeStatus();
              }}
              onFocus={placeStatus}
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
              <span className={legacy.healthDot} data-state={state} aria-hidden="true" />
            </button>
            <span className={legacy.statusTooltip} data-status-popup="">
              {tooltip}
            </span>
          </div>
        </div>
        <button
          type="button"
          data-details-for={item.id}
          className={legacy.inspect}
          onClick={() => onDetails(item.id)}
          aria-label={`Inspect ${label}`}
        >
          {metrics.length > 0 && (
            <span
              className={legacy.metrics}
              data-count={metrics.length}
              data-wide-values={
                metrics.some((metric) => metric.compactValue.length > 6) || undefined
              }
              style={{ "--metric-count": metrics.length } as CSSProperties}
            >
              {metrics.map((metric) => (
                <span className={legacy.metric} key={metric.id}>
                  <span className={legacy.metricValue} title={metric.displayValue}>
                    {metric.compactValue}
                  </span>
                  <span className={legacy.metricLabel} title={metric.label}>
                    {metric.label}
                  </span>
                </span>
              ))}
            </span>
          )}
        </button>
      </article>
    );

  // The status dot, in the same corner of every card and chip, is the only way to open
  // details; the rest of the card opens the service itself.
  const status = (
    <div
      ref={statusRef}
      className={styles.status}
      data-below={statusBelow || undefined}
      onPointerEnter={(event) => {
        if (event.pointerType === "mouse") placeStatus();
      }}
    >
      <button
        type="button"
        className={styles.statusTrigger}
        aria-label={`Status for ${label}: ${health.label}`}
        aria-describedby={ageLabel ? `${statusId} ${statusId}-age` : statusId}
        aria-haspopup="dialog"
        data-details-for={item.id}
        onClick={() => onDetails(item.id)}
        onFocus={placeStatus}
        onKeyDown={(event) => {
          if (event.key === "Escape") event.currentTarget.blur();
        }}
      >
        <span className={styles.dot} data-state={state} aria-hidden="true" />
      </button>
      <span
        className={styles.tooltip}
        data-status-popup=""
        style={statusShift ? { translate: `${statusShift}px 0` } : undefined}
      >
        {tooltip}
        {ageLabel && <span id={`${statusId}-age`}>{ageLabel}</span>}
        <span className={styles.tooltipHint}>Select for details</span>
      </span>
    </div>
  );
  const launch = item.href && (
    <a
      className={styles.launch}
      href={item.href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`${label} (opens in a new tab)`}
    />
  );

  if (!hasMetrics)
    return (
      <article className={styles.chip} data-overview="" {...attributes}>
        {launch}
        <span className={styles.chipIcon} aria-hidden="true">
          {icon}
        </span>
        <h3 className={styles.name}>{label}</h3>
        {health.attention && reason && <span className={styles.chipReason}>{reason}</span>}
        {item.href && <ArrowUpRight className={styles.arrow} size={13} aria-hidden="true" />}
        {status}
      </article>
    );

  const [lead, ...rest] = metrics;
  const problem = health.attention && reason;
  const secondary = problem ? metrics : rest;
  const leadPercent =
    lead?.unit === "percent" && lead.numericValue !== undefined
      ? Math.max(0, Math.min(100, lead.numericValue))
      : null;
  return (
    <article className={styles.tile} data-overview="" {...attributes}>
      {launch}
      <header className={styles.head}>
        <span className={styles.icon} aria-hidden="true">
          {icon}
        </span>
        <h3 className={styles.name}>{label}</h3>
        {item.href && <ArrowUpRight className={styles.arrow} size={13} aria-hidden="true" />}
        {status}
      </header>
      <div className={styles.body} data-testid="item-stats">
        {problem ? (
          <span className={styles.problem}>{reason}</span>
        ) : lead ? (
          <>
            <span className={styles.value}>
              <span title={lead.displayValue}>{lead.compactValue}</span>
              <small>{lead.label}</small>
            </span>
            {leadPercent !== null && (
              <span className={styles.meter} aria-hidden="true">
                <span style={{ width: `${leadPercent}%` }} />
              </span>
            )}
          </>
        ) : (
          <span className={styles.empty}>{reason ?? "Service details"}</span>
        )}
        {secondary.length > 0 && (
          <span className={styles.rest}>
            {secondary.map((metric) => (
              <span key={metric.id} title={metric.displayValue}>
                <b>{metric.compactValue}</b> {metric.label}
              </span>
            ))}
          </span>
        )}
      </div>
    </article>
  );
});
