/**
 * Server-compatible DownloadItem component.
 * Renders a single download with progress, size, activity, and time left.
 */

import { Clock, Download } from "lucide-react";
import { ListItem } from "@/components/widgets/list-item";
import type { ListItemTrailingItem } from "@/components/widgets/list-item/types";
import type { DownloadItemData } from "./types";

export function DownloadItem({
  title,
  subtitle,
  progress,
  timeLeft,
  activity,
  size,
}: DownloadItemData) {
  const tooltipText = `${subtitle ? `${subtitle} - ` : ""}${title}${size ? ` - ${size}` : ""}${activity ? ` - ${activity}` : ""}${timeLeft ? ` - ${timeLeft}` : ""}`;

  const trailingItems: ListItemTrailingItem[] = [];
  if (size) trailingItems.push({ text: size });
  if (activity) trailingItems.push({ text: activity });
  if (timeLeft) trailingItems.push({ icon: Clock, text: timeLeft });

  return (
    <ListItem
      title={title}
      subtitle={subtitle}
      progress={progress}
      leading={Download}
      trailing={trailingItems}
      tooltip={tooltipText}
      marquee
    />
  );
}
