/**
 * ActiveStreamItem component using the new unified ListItem design.
 * For Plex/Jellyfin/Emby streams.
 */

import type { ActiveStream } from "./types";
import { ListItem } from "@/components/widgets/list-item";

interface ActiveStreamItemProps extends ActiveStream {
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
  onTogglePlayback: _onTogglePlayback,
}: ActiveStreamItemProps) {
  return (
    <ListItem
      item={{
        kind: "media",
        title,
        subtitle,
        user,
        progress,
        duration,
        state: state ?? "playing",
        streamId,
        transcoding,
      }}
    />
  );
}
