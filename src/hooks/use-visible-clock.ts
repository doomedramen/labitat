"use client";
import { useSyncExternalStore } from "react";

// One clock for every card, paused while the dashboard is hidden.
let now: number | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
const listeners = new Set<() => void>();
function tick() {
  now = Date.now();
  listeners.forEach((listener) => listener());
}
function visibility() {
  clearInterval(timer);
  timer = undefined;
  if (document.visibilityState === "hidden") return;
  tick();
  timer = setInterval(tick, 10_000);
}
function subscribe(listener: () => void) {
  listeners.add(listener);
  if (listeners.size === 1) {
    document.addEventListener("visibilitychange", visibility);
    visibility();
  }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) {
      clearInterval(timer);
      timer = undefined;
      document.removeEventListener("visibilitychange", visibility);
    }
  };
}
export function useVisibleClock() {
  return useSyncExternalStore(
    subscribe,
    () => now,
    () => null,
  );
}
