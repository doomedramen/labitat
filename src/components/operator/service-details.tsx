"use client";
import { useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { getService } from "@/lib/adapters";
import { fullMetric, getServicePresentation } from "@/lib/service-presentation";
import { parseStatCardOrder, resolveStatCardLayout } from "@/lib/stat-card-layout";
import type { ItemRow } from "@/lib/types";
import { useItemLive, useLiveConnection } from "@/components/dashboard/use-item-live";
import { useVisibleClock } from "@/hooks/use-visible-clock";
import { formatAgeVerbose } from "@/lib/utils/age";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DownloadList } from "@/components/widgets/download/download-list";
import { ActiveStreamList } from "@/components/widgets/active-stream/active-stream-list";
import { LocalClock } from "./local-clock";
import { ItemIcon } from "@/components/dashboard/item/item-icon";
import { serviceHealth } from "@/lib/service-health";
import styles from "./operator.module.css";
const HistoryPanel = dynamic(() => import("./history-panel"), {
  ssr: false,
  loading: () => <p className="text-sm text-muted-foreground">Loading history…</p>,
});
export function ServiceDetails({
  item,
  onClose,
  onConfigure,
  onDelete,
  canConfigure,
  onRestoreFocus,
}: {
  item: ItemRow | null;
  onClose: () => void;
  onConfigure: (item: ItemRow) => void;
  onDelete: (item: ItemRow) => void;
  canConfigure: boolean;
  onRestoreFocus: () => void;
}) {
  useEffect(() => {
    const root = document.documentElement;
    const measure = () => {
      if (document.querySelector('[data-operator-panel][data-state="open"]')) return;
      root.style.setProperty(
        "--operator-scrollbar-gutter",
        `${Math.max(0, window.innerWidth - root.getBoundingClientRect().width)}px`,
      );
    };
    measure();
    window.addEventListener("resize", measure);
    return () => {
      window.removeEventListener("resize", measure);
      root.style.removeProperty("--operator-scrollbar-gutter");
    };
  }, []);
  return (
    <Dialog
      open={!!item}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent
        presentation="panel"
        data-operator-panel=""
        className={styles.panel}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          onRestoreFocus();
        }}
      >
        {item && (
          <DetailsContent
            key={item.id}
            item={item}
            onConfigure={onConfigure}
            onDelete={onDelete}
            canConfigure={canConfigure}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
function DetailsContent({
  item,
  onConfigure,
  onDelete,
  canConfigure,
}: {
  item: ItemRow;
  onConfigure: (item: ItemRow) => void;
  onDelete: (item: ItemRow) => void;
  canConfigure: boolean;
}) {
  const live = useItemLive(item.id);
  const now = useVisibleClock();
  const connection = useLiveConnection();
  const service = item.serviceType ? getService(item.serviceType) : null;
  const data = live?.widgetData ?? null;
  const presentation = useMemo(() => getServicePresentation(service, data), [service, data]);
  const metrics = useMemo(
    () =>
      resolveStatCardLayout(
        presentation.metrics,
        parseStatCardOrder(item.statCardOrder),
        presentation.defaultActiveIds,
      ).activeItems,
    [presentation, item.statCardOrder],
  );
  const health = serviceHealth(item, live, now ?? 0, service?.clientSide);
  const payload = useMemo(() => {
    try {
      return data && data._status !== "error" ? service?.toPayload?.(data) : null;
    } catch {
      return null;
    }
  }, [service, data]);
  const custom =
    ["chart", "processes", "search", "visual"].includes(presentation.detailKind) &&
    data &&
    data._status !== "error" &&
    service?.renderWidget;
  const age = (timestamp: number | null | undefined) =>
    timestamp != null && now != null ? formatAgeVerbose(Math.max(0, now - timestamp)) : "Unknown";
  return (
    <div className={styles.detailContent}>
      <DialogHeader className={styles.detailIdentity}>
        <ItemIcon
          iconUrl={item.iconUrl}
          label={item.label}
          serviceIcon={service?.icon ?? null}
          size="lg"
        />
        <div>
          <DialogTitle className={styles.detailTitle}>{item.label}</DialogTitle>
          <DialogDescription className={styles.detailDescription}>
            <span
              className={styles.detailHealthDot}
              data-state={
                health.attention
                  ? health.tone
                  : health.stale
                    ? "stale"
                    : health.label === "Healthy"
                      ? "healthy"
                      : "unknown"
              }
              aria-hidden="true"
            />
            {health.label} · {service?.name ?? "Service link"}
          </DialogDescription>
        </div>
      </DialogHeader>
      <div className={styles.detailActions}>
        {item.href && (
          <Button asChild variant="outline">
            <a href={item.href} target="_blank" rel="noopener noreferrer">
              Open service ↗
            </a>
          </Button>
        )}
        {canConfigure && (
          <Button variant="outline" onClick={() => onConfigure(item)}>
            Configure
          </Button>
        )}
        {canConfigure && (
          <Button variant="ghost" onClick={() => onDelete(item)}>
            Delete
          </Button>
        )}
      </div>
      {health.reason && (
        <p role="status" className="text-sm text-warning">
          {health.reason}
        </p>
      )}
      {!!metrics.length && (
        <section aria-labelledby="selected-metrics-heading">
          <h3 id="selected-metrics-heading" className={styles.detailSectionTitle}>
            Selected metrics
          </h3>
          <dl className={styles.detailMetrics}>
            {metrics.map((metric) => (
              <div key={metric.id}>
                <dt>{metric.label}</dt>
                <dd>{fullMetric(metric)}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      {presentation.detailKind === "clock" ? (
        <LocalClock itemId={item.id} />
      ) : custom ? (
        <div className={styles.customDetails}>
          {(() => {
            const Custom = custom;
            return <Custom {...data!} />;
          })()}
        </div>
      ) : (
        payload?.customComponent
      )}
      {!!payload?.downloads?.length && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">Downloads</h3>
          <DownloadList downloads={payload.downloads} />
        </section>
      )}
      {!!payload?.streams?.length && (
        <section className="space-y-3">
          <h3 className="text-sm font-medium">Active streams</h3>
          <ActiveStreamList streams={payload.streams} />
        </section>
      )}
      {presentation.unavailable && presentation.detailKind === "standard" && item.serviceType && (
        <p className="text-sm text-muted-foreground">No usable observation yet.</p>
      )}
      {!service?.clientSide && !["visual", "search"].includes(presentation.detailKind) && (
        <HistoryPanel itemId={item.id} metrics={metrics} />
      )}
      <section className="space-y-3 border-t border-border pt-4">
        <h3 className="text-sm font-medium">Connection diagnostics</h3>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
          <dt className="text-muted-foreground">Last successful update</dt>
          <dd>{age(live?.lastSuccessAt)}</dd>
          <dt className="text-muted-foreground">Last attempt</dt>
          <dd>{age(live?.lastAttemptAt)}</dd>
          <dt className="text-muted-foreground">Polling interval</dt>
          <dd>{(item.pollingMs ?? service?.defaultPollingMs ?? 30000) / 1000} seconds</dd>
          <dt className="text-muted-foreground">Live connection</dt>
          <dd>{connection}</dd>
        </dl>
        <p className="text-xs text-muted-foreground">
          {live?.lastSuccessAt != null
            ? new Date(live.lastSuccessAt).toLocaleString()
            : "Successful-update time is unknown."}
        </p>
      </section>
    </div>
  );
}
