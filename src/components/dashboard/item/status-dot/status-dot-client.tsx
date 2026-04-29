"use client";

import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

interface StatusDotClientProps {
  dot: React.ReactNode;
  content: React.ReactNode;
}

/**
 * Client-only wrapper that adds HoverCard tooltip to the status dot.
 * Used when the status dot needs extra hover details.
 */
export function StatusDotClient({ dot, content }: StatusDotClientProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>{dot}</HoverCardTrigger>
      <HoverCardContent
        side="top"
        align="center"
        className="w-auto overflow-hidden rounded-xl border border-border/50 bg-popover/95 p-0 shadow-lg backdrop-blur-sm"
      >
        {content}
      </HoverCardContent>
    </HoverCard>
  );
}
