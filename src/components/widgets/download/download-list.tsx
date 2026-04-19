"use client";

/**
 * Server-compatible DownloadList component.
 * Renders a sorted list of downloads (active downloads first, then by progress).
 */

import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { DownloadItem } from "./download-item";
import type { DownloadItemData } from "./types";

interface DownloadListProps {
  downloads: DownloadItemData[];
}

export function DownloadList({ downloads }: DownloadListProps) {
  if (downloads.length === 0) return null;

  const isMobile = useIsMobile();
  const sorted = [...downloads].sort((a, b) => {
    const isActiveA =
      a.activity?.toLowerCase().includes("download") ||
      a.activity?.toLowerCase().includes("import");
    const isActiveB =
      b.activity?.toLowerCase().includes("download") ||
      b.activity?.toLowerCase().includes("import");

    if (isActiveA && !isActiveB) return -1;
    if (!isActiveA && isActiveB) return 1;

    return b.progress - a.progress;
  });

  return (
    <TooltipProvider delayDuration={isMobile ? 0 : 600}>
      <div className="flex flex-col gap-1">
        {sorted.map((download) => (
          <DownloadItem key={download.title} {...download} />
        ))}
      </div>
    </TooltipProvider>
  );
}
