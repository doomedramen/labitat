import { Download, Radio } from "lucide-react";
import type { ActiveStream } from "@/components/widgets/active-stream/types";
import type { DownloadItemData } from "@/components/widgets/download/types";
import { activityProgress, type ActivityObservation } from "@/lib/service-activity";
import styles from "./operator.module.css";

export function TileActivity({
  kind,
  observation,
  onDetails,
}: {
  kind: "downloads" | "streams";
  observation: ActivityObservation;
  onDetails: () => void;
}) {
  const downloads = kind === "downloads";
  const entries = observation[kind];
  const Icon = downloads ? Download : Radio;
  const singular = downloads ? "download" : "active stream";
  const heading = entries.length
    ? `${entries.length} ${singular}${entries.length === 1 ? "" : "s"}`
    : downloads
      ? "Downloads"
      : "Active streams";
  return (
    <div className={styles.tileActivity}>
      <div className={styles.tileActivityHeader}>
        <h4>
          <Icon size={14} aria-hidden="true" /> {heading}
        </h4>
        {entries.length > 2 && (
          <button type="button" className={styles.tileActivityMore} onClick={onDetails}>
            View all
          </button>
        )}
      </div>
      {entries.length ? (
        <ul className={styles.tileActivityList}>
          {entries.slice(0, 2).map((entry, index) => {
            const stream = downloads ? null : (entry as ActiveStream);
            const download = downloads ? (entry as DownloadItemData) : null;
            const percent = activityProgress(entry.progress, stream ? stream.duration : 100);
            const title = [entry.subtitle, entry.title].filter(Boolean).join(" · ");
            const meta = download
              ? [
                  download.size,
                  download.timeLeft && `${download.timeLeft} left`,
                  download.speed || download.activity,
                ]
              : [stream?.episode, stream?.user, stream?.state];
            return (
              <li key={`${entry.title}:${index}`} className={styles.tileActivityEntry}>
                <div className={styles.tileActivityLine}>
                  <span title={title}>{title}</span>
                  {percent !== null && <span aria-hidden="true">{Math.round(percent)}%</span>}
                </div>
                {percent !== null && (
                  <div
                    className={styles.activityProgress}
                    role="progressbar"
                    aria-label={entry.title}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(percent)}
                  >
                    <span style={{ width: `${percent}%` }} />
                  </div>
                )}
                {meta.some(Boolean) && <p>{meta.filter(Boolean).join(" · ")}</p>}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className={styles.tileActivityEmpty}>
          {observation.reason || `No ${downloads ? "downloads" : "streams"} to show`}
        </p>
      )}
    </div>
  );
}
