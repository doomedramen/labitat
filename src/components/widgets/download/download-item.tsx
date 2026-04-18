/**
 * DownloadItem component using the new unified ListItem design.
 */

import type { DownloadItemData } from "./types";
import { ListItem, type ActivityState } from "@/components/widgets/list-item";

const ACTIVITY_MAP: Record<string, ActivityState> = {
  downloading: "Downloading",
  "forced downloading": "Forced downloading",
  importing: "Importing",
  queued: "Queued",
  stalled: "Stalled",
  paused: "Paused",
  "fetching metadata": "Fetching metadata",
  "import pending": "Import pending",
  "failed pending": "Failed pending",
  failed: "Failed",
};

function normalizeActivity(activity?: string): ActivityState {
  if (!activity) return "Queued";
  const normalized = activity.toLowerCase();
  return ACTIVITY_MAP[normalized] ?? "Queued";
}

export function DownloadItem({
  title,
  subtitle,
  progress,
  timeLeft,
  activity,
  size,
}: DownloadItemData) {
  return (
    <ListItem
      item={{
        kind: "download",
        title,
        subtitle,
        progress,
        timeLeft,
        activity: normalizeActivity(activity),
        size,
      }}
    />
  );
}
