/**
 * Server-compatible ActiveStreamItem component.
 * Renders a single active stream with progress, user, and transcoding info.
 */

import { Clock, Monitor, Cpu, Pause, Play } from "lucide-react";
import { ListItem } from "@/components/widgets/list-item";
import type { ListItemTrailingItem } from "@/components/widgets/list-item/types";
import type { ActiveStream } from "./types";
import { formatDuration } from "./utils";

interface ActiveStreamItemProps extends ActiveStream {
  /** Callback for play/pause toggle */
  onTogglePlayback?: (streamId: string) => void;
}

export function ActiveStreamItem({
  title,
  subtitle,
  user,
  progress,
  duration,
  state,
  streamId,
  transcoding,
  onTogglePlayback,
}: ActiveStreamItemProps) {
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0;
  const remaining = Math.max(0, duration - progress);
  const displayTitle = subtitle ? `${subtitle} · ${title}` : title;

  const handlePlayPause = () => {
    if (streamId && onTogglePlayback) {
      onTogglePlayback(streamId);
    }
  };

  const trailingItems: ListItemTrailingItem[] = [];
  if (transcoding) {
    trailingItems.push({
      icon: transcoding.isDirect ? Monitor : Cpu,
      iconTitle: transcoding.isDirect ? "Direct play" : "Software transcoding",
    });
  }
  trailingItems.push({
    icon: Clock,
    text: formatDuration(remaining),
  });

  return (
    <ListItem
      title={title}
      subtitle={subtitle}
      progress={progressPercent}
      leading={state === "paused" ? Pause : Play}
      onLeadingClick={streamId && onTogglePlayback ? handlePlayPause : undefined}
      trailing={trailingItems}
      divider=""
      tooltip={
        <div className="flex flex-col gap-1">
          <div className="font-medium">{displayTitle}</div>
          <div>User: {user}</div>
          {duration > 0 && (
            <div>
              {formatDuration(progress)} / {formatDuration(duration)}
            </div>
          )}
          {transcoding && (
            <div>
              {transcoding.isDirect
                ? "Direct play"
                : transcoding.hardwareDecoding && transcoding.hardwareEncoding
                  ? "Hardware transcoding"
                  : "Software transcoding"}
            </div>
          )}
        </div>
      }
    />
  );
}
