"use client";

/**
 * Server-compatible ActiveStreamList component.
 * Renders a sorted list of active streams.
 */

import { TooltipProvider } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
import { ActiveStreamItem } from "./active-stream-item";
import type { ActiveStream } from "./types";

interface ActiveStreamListProps {
  streams: ActiveStream[];
  onTogglePlayback?: (streamId: string) => void;
}

export function ActiveStreamList({ streams, onTogglePlayback }: ActiveStreamListProps) {
  if (streams.length === 0) return null;

  const isMobile = useIsMobile();
  const sorted = [...streams].sort((a, b) => {
    const aKey = `${a.subtitle ?? ""}\x00${a.title}`;
    const bKey = `${b.subtitle ?? ""}\x00${b.title}`;
    return aKey.localeCompare(bKey, undefined, { sensitivity: "base" });
  });

  return (
    <TooltipProvider delayDuration={isMobile ? 0 : 600}>
      <div className="flex w-full flex-col gap-0.5">
        {sorted.map((stream) => (
          <ActiveStreamItem
            key={`${stream.title}-${stream.user}`}
            {...stream}
            onTogglePlayback={onTogglePlayback}
          />
        ))}
      </div>
    </TooltipProvider>
  );
}
