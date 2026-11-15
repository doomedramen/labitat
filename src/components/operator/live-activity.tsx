"use client";

import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { ArrowDownToLine, ChevronRight, Pause, Play } from "lucide-react";
import { useItemLive } from "@/components/dashboard/use-item-live";
import type { DownloadItemData } from "@/components/widgets/download/types";
import { useVisibleClock } from "@/hooks/use-visible-clock";
import { useStalenessFloor } from "@/hooks/use-staleness-floor";
import {
  activityProgress,
  observeServiceActivity,
  serviceActivityKind,
  type ActivityObservation,
} from "@/lib/service-activity";
import type { ItemLive } from "@/lib/live-types";
import type { ItemRow } from "@/lib/types";
import styles from "./activity.module.css";

/** Rows shown before "Show all": four on phones, eight elsewhere (see activity.module.css). */
const COLLAPSED_ROWS = { phone: 4, wide: 8 };

const ActivityObserver = memo(function ActivityObserver({
  item,
  initialNow,
  report,
}: {
  item: ItemRow;
  initialNow: number;
  report: (id: string, value: ActivityObservation) => void;
}) {
  const live = useItemLive(item.id);
  const clock = useVisibleClock();
  const ageFloor = useStalenessFloor();
  const observation = useMemo(
    () => observeServiceActivity(item, live, clock ?? initialNow, ageFloor),
    [item, live, clock, initialNow, ageFloor],
  );
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
  initialSnapshotById,
  onDetails,
}: {
  items: ItemRow[];
  initialNow: number;
  initialSnapshotById?: Record<string, ItemLive>;
  onDetails: (id: string) => void;
}) {
  const [observations, setObservations] = useState<Record<string, ActivityObservation>>(() =>
    Object.fromEntries(
      items
        .filter((item) => initialSnapshotById?.[item.id])
        .map((item) => [
          item.id,
          observeServiceActivity(item, initialSnapshotById![item.id], initialNow, Infinity),
        ]),
    ),
  );
  const [expanded, setExpanded] = useState(false);
  const [issuesExpanded, setIssuesExpanded] = useState(false);
  useEffect(() => {
    function resetActivityDisclosure() {
      setExpanded(false);
      setIssuesExpanded(false);
    }
    document.addEventListener("visibilitychange", resetActivityDisclosure);
    window.addEventListener("pageshow", resetActivityDisclosure);
    return () => {
      document.removeEventListener("visibilitychange", resetActivityDisclosure);
      window.removeEventListener("pageshow", resetActivityDisclosure);
    };
  }, []);
  const report = useCallback((id: string, observation: ActivityObservation) => {
    setObservations((previous) =>
      JSON.stringify(previous[id]) === JSON.stringify(observation)
        ? previous
        : { ...previous, [id]: observation },
    );
  }, []);
  const sources = items.filter((item) => serviceActivityKind(item.serviceType));
  if (!sources.length) return null;
  const downloads = sources.flatMap((item) =>
    (observations[item.id]?.downloads ?? []).map((entry, index) => ({
      item,
      entry,
      index,
      stream: null,
    })),
  );
  const streams = sources.flatMap((item) =>
    (observations[item.id]?.streams ?? []).map((entry, index) => ({
      item,
      entry,
      index,
      stream: entry,
    })),
  );
  // Alternate kinds so the collapsed list shows both downloads and streams.
  const entries = Array.from({ length: Math.max(downloads.length, streams.length) }).flatMap(
    (_, index) => [downloads[index], streams[index]].filter((entry) => !!entry),
  );
  const issues = sources.filter((item) => observations[item.id]?.reason);
  const allObserved = sources.every((item) => observations[item.id]);
  const idle = allObserved && !entries.length && !issues.length;
  const hasDownloads = sources.some(
    (item) => serviceActivityKind(item.serviceType) === "downloads",
  );
  const hasStreams = sources.some((item) => serviceActivityKind(item.serviceType) === "streams");
  const idleLabel =
    hasDownloads && hasStreams
      ? "No downloads or streams"
      : hasDownloads
        ? "No active downloads"
        : "No active streams";
  const count = (total: number, noun: string) => `${total} ${noun}${total === 1 ? "" : "s"}`;
  const summary = [
    hasDownloads && count(downloads.length, "download"),
    hasStreams && count(streams.length, "stream"),
  ]
    .filter(Boolean)
    .join(" · ");
  const collapsible = entries.length > COLLAPSED_ROWS.phone;
  return (
    <section
      className={styles.activity}
      data-idle={idle || undefined}
      data-expanded={expanded || undefined}
      data-overflow={entries.length > COLLAPSED_ROWS.wide || undefined}
      aria-labelledby="live-activity-heading"
    >
      {sources.map((item) => (
        <ActivityObserver key={item.id} item={item} initialNow={initialNow} report={report} />
      ))}
      <header className={styles.lead}>
        <h2 id="live-activity-heading">Live activity</h2>
        {entries.length > 0 && <b>{entries.length}</b>}
        <p>
          {entries.length
            ? summary
            : idle
              ? idleLabel
              : allObserved
                ? "No activity to show"
                : "Checking activity…"}
        </p>
      </header>
      {entries.length > 0 && (
        <div className={styles.rows}>
          {entries.map(({ item, entry, index, stream }) => {
            const download = stream ? null : (entry as DownloadItemData);
            const percent = activityProgress(entry.progress, stream ? stream.duration : 100);
            const detail = [entry.subtitle, stream?.episode, download?.size, download?.activity]
              .filter(Boolean)
              .join(" · ");
            return (
              <button
                key={`${item.id}:${stream ? "s" : "d"}:${index}`}
                type="button"
                className={styles.row}
                style={{ "--progress": `${percent ?? 0}%` } as CSSProperties}
                onClick={() => onDetails(item.id)}
                aria-label={`Inspect ${item.label}: ${entry.title}`}
              >
                <span
                  className={styles.rowKind}
                  data-kind={stream ? "stream" : "download"}
                  title={stream ? "Stream" : "Download"}
                  aria-hidden="true"
                >
                  {!stream ? (
                    <ArrowDownToLine size={14} />
                  ) : stream.state === "paused" ? (
                    <Pause size={14} />
                  ) : (
                    <Play size={14} />
                  )}
                </span>
                <span className={styles.rowTitle}>
                  <strong>{entry.title}</strong>
                  <span>
                    {item.label}
                    {detail ? ` · ${detail}` : ""}
                    {stream && Number.isFinite(stream.progress) && stream.duration > 0
                      ? ` · ${time(stream.progress)} / ${time(stream.duration)}`
                      : ""}
                  </span>
                </span>
                <span className={styles.rowMeta}>
                  {stream ? (
                    <>
                      <span>{stream.user}</span>
                      {stream.state === "paused" && <span>paused</span>}
                    </>
                  ) : (
                    <span>
                      {download?.speed || (download?.timeLeft ? `${download.timeLeft} left` : "")}
                    </span>
                  )}
                </span>
                {percent !== null && (
                  <span
                    className={styles.rowPercent}
                    role="progressbar"
                    aria-label={`${entry.title} progress`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(percent)}
                  >
                    {Math.round(percent)}%
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
      {collapsible && (
        <button
          type="button"
          className={styles.more}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? "Show less" : `Show all ${entries.length}`}
        </button>
      )}
      {issues.length > 0 && (
        <div className={styles.activityIssues}>
          <button
            type="button"
            className={styles.activityIssueToggle}
            aria-expanded={issuesExpanded}
            onClick={() => setIssuesExpanded((value) => !value)}
          >
            {issues.length} {issues.length === 1 ? "source unavailable" : "sources unavailable"}
            <ChevronRight size={15} aria-hidden="true" />
          </button>
          {issuesExpanded &&
            issues.map((item) => (
              <button
                type="button"
                key={item.id}
                className={styles.issue}
                aria-label={`${item.label}: ${observations[item.id]?.reason}`}
                onClick={() => onDetails(item.id)}
              >
                <span>{item.label}</span>
                <span>{observations[item.id]?.reason}</span>
              </button>
            ))}
        </div>
      )}
    </section>
  );
});
