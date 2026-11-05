"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Download, Radio, ChevronRight } from "lucide-react";
import { useItemLive } from "@/components/dashboard/use-item-live";
import type { DownloadItemData } from "@/components/widgets/download/types";
import type { ActiveStream } from "@/components/widgets/active-stream/types";
import { useVisibleClock } from "@/hooks/use-visible-clock";
import { getService } from "@/lib/adapters";
import { serviceHealth } from "@/lib/service-health";
import type { ItemRow } from "@/lib/types";
import styles from "./operator.module.css";

const downloadTypes = new Set(["qbittorrent", "sabnzbd", "transmission", "sonarr", "radarr"]);
const streamTypes = new Set(["plex", "tautulli", "jellyfin", "emby", "frigate"]);
type Observation = {
  downloads: DownloadItemData[];
  streams: ActiveStream[];
  reason: string | null;
};

const ActivityObserver = memo(function ActivityObserver({
  item,
  initialNow,
  report,
}: {
  item: ItemRow;
  initialNow: number;
  report: (id: string, value: Observation) => void;
}) {
  const live = useItemLive(item.id);
  const clock = useVisibleClock();
  const observation = useMemo((): Observation => {
    const service = getService(item.serviceType ?? "");
    const health = serviceHealth(item, live, clock ?? initialNow, service?.clientSide);
    if (
      health.attention ||
      health.stale ||
      !live?.widgetData ||
      live.widgetData._status === "error"
    ) {
      return { downloads: [], streams: [], reason: health.reason || "Awaiting an update" };
    }
    try {
      const payload = service?.toPayload?.(live.widgetData);
      if (payload?.error) return { downloads: [], streams: [], reason: payload.error };
      return { downloads: payload?.downloads ?? [], streams: payload?.streams ?? [], reason: null };
    } catch {
      return { downloads: [], streams: [], reason: "Activity unavailable" };
    }
  }, [item, live, clock, initialNow]);
  useEffect(() => report(item.id, observation), [item.id, observation, report]);
  return null;
});

function time(value: number) {
  const seconds = Math.floor(value);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;
}

export const LiveActivity = memo(function LiveActivity({
  items,
  initialNow,
  onDetails,
}: {
  items: ItemRow[];
  initialNow: number;
  onDetails: (id: string) => void;
}) {
  const [observations, setObservations] = useState<Record<string, Observation>>({});
  const [expanded, setExpanded] = useState({ downloads: false, streams: false });
  const report = useCallback((id: string, observation: Observation) => {
    setObservations((previous) =>
      JSON.stringify(previous[id]) === JSON.stringify(observation)
        ? previous
        : { ...previous, [id]: observation },
    );
  }, []);
  const sources = items.filter(
    (item) => downloadTypes.has(item.serviceType ?? "") || streamTypes.has(item.serviceType ?? ""),
  );
  if (!sources.length) return null;
  const downloads = sources.flatMap((item) =>
    (observations[item.id]?.downloads ?? []).map((entry, index) => ({ item, entry, index })),
  );
  const streams = sources.flatMap((item) =>
    (observations[item.id]?.streams ?? []).map((entry, index) => ({ item, entry, index })),
  );
  const downloadIssues = sources.filter(
    (item) => downloadTypes.has(item.serviceType ?? "") && observations[item.id]?.reason,
  );
  const streamIssues = sources.filter(
    (item) => streamTypes.has(item.serviceType ?? "") && observations[item.id]?.reason,
  );
  return (
    <section className={styles.activity} aria-labelledby="live-activity-heading">
      {sources.map((item) => (
        <ActivityObserver key={item.id} item={item} initialNow={initialNow} report={report} />
      ))}
      <div className={styles.sectionHeading}>
        <div>
          <h2 id="live-activity-heading">Live activity</h2>
        </div>
      </div>
      <div className={styles.activityGrid}>
        {(["downloads", "streams"] as const).map((kind) => {
          const isDownloads = kind === "downloads";
          const entries = isDownloads ? downloads : streams;
          const issues = isDownloads ? downloadIssues : streamIssues;
          const relevant = sources.filter((item) =>
            (isDownloads ? downloadTypes : streamTypes).has(item.serviceType ?? ""),
          );
          if (!relevant.length) return null;
          return (
            <section
              key={kind}
              className={styles.activityPanel}
              data-empty={!entries.length && !issues.length ? true : undefined}
              aria-label={isDownloads ? "Downloads" : "Active streams"}
            >
              <header className={styles.activityHeader}>
                <span className={styles.activityIcon} data-kind={kind}>
                  {isDownloads ? <Download size={19} /> : <Radio size={19} />}
                </span>
                <div>
                  <h3>{isDownloads ? "Downloads" : "Active streams"}</h3>
                  <p>
                    {entries.length
                      ? `${entries.length} available`
                      : issues.length
                        ? "Some sources need attention"
                        : relevant.some((item) => !observations[item.id])
                          ? "Checking activity…"
                          : "No activity to show"}
                  </p>
                </div>
                {entries.length > 2 && (
                  <button
                    type="button"
                    className={styles.activityToggle}
                    onClick={() => setExpanded((v) => ({ ...v, [kind]: !v[kind] }))}
                  >
                    {expanded[kind] ? "Show less" : `Show ${entries.length - 2} more`}
                  </button>
                )}
              </header>
              <div className={styles.activityList}>
                {(expanded[kind] ? entries : entries.slice(0, 2)).map(({ item, entry, index }) => {
                  const progress = entry.progress;
                  const isStream = !isDownloads;
                  const stream = isStream ? (entry as ActiveStream) : null;
                  const download = isDownloads ? (entry as DownloadItemData) : null;
                  const percent =
                    stream &&
                    Number.isFinite(stream.progress) &&
                    Number.isFinite(stream.duration) &&
                    stream.duration > 0
                      ? Math.max(0, Math.min(100, (stream.progress / stream.duration) * 100))
                      : download && typeof progress === "number" && Number.isFinite(progress)
                        ? Math.max(0, Math.min(100, progress))
                        : null;
                  return (
                    <button
                      key={`${item.id}:${index}`}
                      type="button"
                      className={styles.activityEntry}
                      onClick={() => onDetails(item.id)}
                      aria-label={`Inspect ${item.label}: ${entry.title}`}
                    >
                      <span className={styles.activityEntryHead}>
                        <strong>{entry.title}</strong>
                        {(download?.speed || stream?.state) && (
                          <span className={styles.activityRate}>
                            {download?.speed || stream?.state}
                          </span>
                        )}
                        <ChevronRight size={15} />
                      </span>
                      {(entry.subtitle ||
                        stream?.episode ||
                        stream?.user ||
                        download?.timeLeft) && (
                        <span className={styles.activityMeta}>
                          <span>
                            {[entry.subtitle, stream?.episode].filter(Boolean).join(" · ")}
                          </span>
                          <span>
                            {download?.timeLeft ? `${download.timeLeft} left` : stream?.user}
                          </span>
                        </span>
                      )}
                      {percent !== null && (
                        <span
                          className={styles.activityProgress}
                          role="progressbar"
                          aria-label={`${entry.title} progress`}
                          aria-valuemin={0}
                          aria-valuemax={100}
                          aria-valuenow={Math.round(percent)}
                        >
                          <span style={{ width: `${percent}%` }} />
                        </span>
                      )}
                      <span className={styles.activityFoot}>
                        <span>
                          {item.label}
                          {download?.size ? ` · ${download.size}` : ""}
                          {stream &&
                          Number.isFinite(stream.progress) &&
                          Number.isFinite(stream.duration) &&
                          stream.duration > 0
                            ? ` · ${time(stream.progress)} / ${time(stream.duration)}`
                            : ""}
                          {download?.activity ? ` · ${download.activity}` : ""}
                        </span>
                        {percent !== null && <span>{Math.round(percent)}%</span>}
                      </span>
                    </button>
                  );
                })}
                {issues.map((item) => (
                  <p key={item.id} className={styles.activityIssue}>
                    {item.label} · {observations[item.id]?.reason}
                  </p>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
});
