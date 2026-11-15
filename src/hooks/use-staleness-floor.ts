"use client";
import { useSyncExternalStore } from "react";
import { liveStore, stalenessFloor } from "@/lib/live-store";

const held = () => Infinity;

/** The moment data age may be counted from; Infinity while live updates are paused or opening. */
export function useStalenessFloor(): number {
  return useSyncExternalStore(
    liveStore.subscribeMeta,
    () => stalenessFloor(liveStore.getMeta()),
    held,
  );
}
