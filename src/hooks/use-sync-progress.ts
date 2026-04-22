"use client";

import { useEffect, useRef, useState } from "react";
import { useItemLastUpdateAt } from "./use-live-data";

/**
 * Calculate sync progress percentage (0-100) based on polling interval
 * Uses a local timer that increments smoothly, only resetting when new data arrives
 * Progress only animates when data is not cached - shows 0% (full ring) for cached data
 *
 * @param itemId - The item ID to track
 * @param pollingMs - The polling interval in milliseconds
 * @param cached - Whether the data is from cache (if true, progress stays at 0)
 * @returns Progress percentage (0-100) indicating time until next sync
 */
export function useSyncProgress(itemId: string, pollingMs: number, cached: boolean): number {
  const lastUpdateAt = useItemLastUpdateAt(itemId);
  const [progress, setProgress] = useState(0);
  const lastUpdateRef = useRef(lastUpdateAt);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef(Date.now());
  const hasReceivedLiveDataRef = useRef(false);

  useEffect(() => {
    // Reset progress when new data arrives (lastUpdateAt changes)
    // Only start animating after first live (non-cached) data
    if (lastUpdateAt !== lastUpdateRef.current) {
      lastUpdateRef.current = lastUpdateAt;

      // Only start the animation timer on live data
      if (!cached) {
        hasReceivedLiveDataRef.current = true;
        startTimeRef.current = Date.now();
        setProgress(0);
        // console.log(`[sync-progress] ${itemId} reset to 0 (was ${wasReset ? 'active' : 'inactive'}, cached=${cached})`);
      }
    }
  }, [lastUpdateAt, cached, itemId]);

  useEffect(() => {
    // Don't animate if we haven't received live data yet
    if (!hasReceivedLiveDataRef.current) {
      return;
    }

    const updateProgress = () => {
      const elapsed = Date.now() - startTimeRef.current;
      const newProgress = Math.min((elapsed / pollingMs) * 100, 100);

      // Log progress at key milestones (debug)
      // if (newProgress < 5 && progress >= 5) {
      //   console.log(`[sync-progress] ${itemId} starting: ${newProgress.toFixed(1)}%`);
      // } else if (newProgress >= 50 && progress < 50) {
      //   console.log(`[sync-progress] ${itemId} halfway: ${newProgress.toFixed(1)}%`);
      // } else if (newProgress >= 95 && progress < 95) {
      //   console.log(`[sync-progress] ${itemId} almost done: ${newProgress.toFixed(1)}%`);
      // }

      setProgress(newProgress);

      if (newProgress < 100) {
        animationFrameRef.current = requestAnimationFrame(updateProgress);
      }
    };

    animationFrameRef.current = requestAnimationFrame(updateProgress);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [lastUpdateAt, pollingMs, itemId, progress]); // Reset timer when lastUpdateAt changes

  // Return 0 (full ring) until we receive live data
  return hasReceivedLiveDataRef.current ? progress : 0;
}
