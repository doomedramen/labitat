"use client";

import { useEffect, useRef, useState } from "react";
import { useItemLive } from "@/components/dashboard/use-item-live";

/**
 * Calculate sync progress percentage (0-100) based on polling interval
 * Uses a continuous animation loop that calculates progress from the last update timestamp
 *
 * @param itemId - The item ID to track
 * @param pollingMs - The polling interval in milliseconds
 * @returns Progress percentage (0-100) indicating time until next sync
 */
export function useSyncProgress(itemId: string, pollingMs: number): number {
  const live = useItemLive(itemId);
  const lastUpdateAt = live?.itemLastUpdateAt ?? null;
  const lastUpdateAtRef = useRef<number | null>(lastUpdateAt);
  const [progress, setProgress] = useState(0);

  // Keep ref in sync with the latest lastUpdateAt
  useEffect(() => {
    lastUpdateAtRef.current = lastUpdateAt;
  }, [lastUpdateAt]);

  useEffect(() => {
    let animationFrameId: number;

    const updateProgress = () => {
      const lastUpdate = lastUpdateAtRef.current;

      if (lastUpdate === null) {
        // No live data yet - show full ring (0% progress)
        setProgress(0);
      } else {
        const elapsed = Date.now() - lastUpdate;
        const newProgress = Math.min((elapsed / pollingMs) * 100, 100);
        setProgress(newProgress);
      }

      animationFrameId = requestAnimationFrame(updateProgress);
    };

    // Start the continuous loop
    animationFrameId = requestAnimationFrame(updateProgress);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [pollingMs]);

  return progress;
}
