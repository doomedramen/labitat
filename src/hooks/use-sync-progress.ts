"use client";

import { useMemo, useEffect, useState } from "react";
import { useItemLastUpdateAt } from "./use-live-data";

/**
 * Calculate sync progress percentage (0-100) based on polling interval
 *
 * @param itemId - The item ID to track
 * @param pollingMs - The polling interval in milliseconds
 * @returns Progress percentage (0-100) indicating time until next sync
 */
export function useSyncProgress(itemId: string, pollingMs: number): number {
  const lastUpdateAt = useItemLastUpdateAt(itemId);
  const [, forceRender] = useState({});

  // Re-render periodically to update the progress
  useEffect(() => {
    // Update every 100ms for smooth animation
    const interval = setInterval(() => {
      forceRender({});
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return useMemo(() => {
    if (lastUpdateAt === 0) {
      // No update yet, show full progress (waiting for first fetch)
      return 100;
    }

    const elapsed = Date.now() - lastUpdateAt;
    const progress = Math.min((elapsed / pollingMs) * 100, 100);
    return progress;
  }, [lastUpdateAt, pollingMs]);
}
