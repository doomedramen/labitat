"use client";

import { useEffect, useRef, useState } from "react";
import { useItemLastUpdateAt } from "./use-live-data";

/**
 * Calculate sync progress percentage (0-100) based on polling interval
 * Uses a local timer that increments smoothly, only resetting when new data arrives
 *
 * @param itemId - The item ID to track
 * @param pollingMs - The polling interval in milliseconds
 * @returns Progress percentage (0-100) indicating time until next sync
 */
export function useSyncProgress(itemId: string, pollingMs: number): number {
  const lastUpdateAt = useItemLastUpdateAt(itemId);
  const [progress, setProgress] = useState(0);
  const lastUpdateRef = useRef(lastUpdateAt);
  const animationFrameRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // Reset progress when new data arrives (lastUpdateAt changes)
    if (lastUpdateAt !== lastUpdateRef.current) {
      lastUpdateRef.current = lastUpdateAt;
      setProgress(0);
    }
  }, [lastUpdateAt]);

  useEffect(() => {
    const startTime = Date.now();
    const startProgress = progress;

    const updateProgress = () => {
      const elapsed = Date.now() - startTime;
      const newProgress = Math.min(startProgress + (elapsed / pollingMs) * 100, 100);
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
  }, [lastUpdateAt, pollingMs]); // Reset timer when lastUpdateAt changes

  return progress;
}
