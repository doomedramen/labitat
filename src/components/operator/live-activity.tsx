"use client";

import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Download, Radio, ChevronRight } from "lucide-react";
import { useItemLive } from "@/components/dashboard/use-item-live";
import type { DownloadItemData } from "@/components/widgets/download/types";
import type { ActiveStream } from "@/components/widgets/active-stream/types";
import { useVisibleClock } from "@/hooks/use-visible-clock";
import {
  activityProgress,
  observeServiceActivity,
  serviceActivityKind,
  type ActivityObservation,
} from "@/lib/service-activity";
import type { ItemLive } from "@/lib/live-types";
import type { ItemRow } from "@/lib/types";
import styles from "./operator.module.css";

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
  const observation = useMemo(
    () => observeServiceActivity(item, live, clock ?? initialNow),
    [item, live, clock, initialNow],
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
          observeServiceActivity(item, initialSnapshotById![item.id], initialNow),
        ]),
    ),
  );
  const [expanded, setExpanded] = useState({ downloads: false, streams: false });
  const [issuesExpanded, setIssuesExpanded] = useState({ downloads: false, streams: false });
  useEffect(() => {
    function resetActivityDisclosure() {
      setExpanded({ downloads: false, streams: false });
      setIssuesExpanded({ downloads: false, streams: false });
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
    (observations[item.id]?.downloads ?? []).map((entry, index) => ({ item, entry, index })),
  );
  const streams = sources.flatMap((item) =>
    (observations[item.id]?.streams ?? []).map((entry, index) => ({ item, entry, index })),
  );
  const downloadIssues = sources.filter(
    (item) =>
      serviceActivityKind(item.serviceType) === "downloads" && observations[item.id]?.reason,
  );
  const streamIssues = sources.filter(
    (item) => serviceActivityKind(item.serviceType) === "streams" && observations[item.id]?.reason,
  );
  const allObserved = sources.every((item) => observations[item.id]);
  const idle =
    allObserved &&
    !downloads.length &&
    !streams.length &&
    !downloadIssues.length &&
    !streamIssues.length;
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
  return (
    <section
      className={styles.activity}
      data-idle={idle || undefined}
      aria-labelledby="live-activity-heading"
    >
      {sources.map((item) => (
        <ActivityObserver key={item.id} item={item} initialNow={initialNow} report={report} />
      ))}
      <div className={styles.sectionHeading}>
        <div>
          <h2 id="live-activity-heading">Live activity</h2>
        </div>
      </div>
      {idle && (
        <div className={styles.activityIdle}>
          <span>Live activity</span>
          <span>{idleLabel}</span>
        </div>
      )}
      <div className={styles.activityGrid}>
        {(["downloads", "streams"] as const).map((kind) => {
          const isDownloads = kind === "downloads";
          const entries = isDownloads ? downloads : streams;
          const issues = isDownloads ? downloadIssues : streamIssues;
          const relevant = sources.filter((item) => serviceActivityKind(item.serviceType) === kind);
          if (!relevant.length) return null;
          return (
            <section
              key={kind}
              className={styles.activityPanel}
              data-empty={
                !entries.length && !issues.length && relevant.every((item) => observations[item.id])
                  ? true
                  : undefined
              }
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
                  const isStream = !isDownloads;
                  const stream = isStream ? (entry as ActiveStream) : null;
                  const download = isDownloads ? (entry as DownloadItemData) : null;
                  const percent = activityProgress(entry.progress, stream ? stream.duration : 100);
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
                {issues.length > 0 && (
                  <div className={styles.activityIssues}>
                    <button
                      type="button"
                      className={styles.activityIssueToggle}
                      aria-expanded={issuesExpanded[kind]}
                      onClick={() => setIssuesExpanded((v) => ({ ...v, [kind]: !v[kind] }))}
                    >
                      {issues.length}{" "}
                      {issues.length === 1 ? "source unavailable" : "sources unavailable"}
                      <ChevronRight size={15} aria-hidden="true" />
                    </button>
                    {issuesExpanded[kind] &&
                      issues.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          className={styles.activityIssue}
                          aria-label={`${item.label}: ${observations[item.id]?.reason}`}
                          onClick={() => onDetails(item.id)}
                        >
                          <span>{item.label}</span>
                          <span>{observations[item.id]?.reason}</span>
                        </button>
                      ))}
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </section>
  );
});
