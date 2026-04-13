"use client";

import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";

interface StatusDotClientProps {
  dot: React.ReactNode;
  reason: string;
}

/**
 * Client-only wrapper that adds HoverCard tooltip to the status dot.
 * Used when the status has a reason (error, degraded, slow).
 */
export function StatusDotClient({ dot, reason }: StatusDotClientProps) {
  return (
    <HoverCard>
      <HoverCardTrigger asChild>{dot}</HoverCardTrigger>
      <HoverCardContent side="top" align="center" className="w-auto">
        {reason}
      </HoverCardContent>
    </HoverCard>
  );
}
