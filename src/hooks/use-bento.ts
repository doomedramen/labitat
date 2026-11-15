"use client";
import { useLayoutEffect, useRef, useState } from "react";

/** Grid row unit for packed layouts; smaller is tighter packing, larger is less work. */
export const BENTO_ROW = 4;

/**
 * Packs a CSS grid's children by their natural height: each child spans as many
 * BENTO_ROW-high rows as it needs, so short items no longer stretch to their row's
 * tallest neighbour. Combine with `grid-auto-flow: dense` to fill gaps.
 *
 * The container gets `data-bento` only on the client, where spans are measured before
 * paint, so server-rendered HTML (and a failed script) shows an ordinary grid.
 */
export function useBento<T extends HTMLElement>(enabled = true) {
  const ref = useRef<T>(null);
  useLayoutEffect(() => {
    const grid = ref.current;
    if (!enabled || !grid || typeof ResizeObserver === "undefined") return;
    const size = (item: Element) => {
      if (!(item instanceof HTMLElement)) return;
      // Packed grids use no row gap; an item's bottom margin is its spacing instead,
      // which keeps packing precise to BENTO_ROW rather than to the gap.
      const height =
        item.getBoundingClientRect().height +
        (parseFloat(getComputedStyle(item).marginBottom) || 0);
      const span = Math.max(1, Math.ceil(height / BENTO_ROW));
      if (item.style.gridRowEnd !== `span ${span}`) item.style.gridRowEnd = `span ${span}`;
    };
    const resize = new ResizeObserver((entries) => entries.forEach((entry) => size(entry.target)));
    const watch = () => {
      resize.disconnect();
      for (const child of grid.children) {
        size(child);
        resize.observe(child);
      }
    };
    // Switch the grid to packed rows first so spans use its packed spacing, then size
    // every item before the browser paints.
    grid.dataset.bento = "";
    watch();
    const children = new MutationObserver(watch);
    children.observe(grid, { childList: true });
    return () => {
      resize.disconnect();
      children.disconnect();
      delete grid.dataset.bento;
      for (const child of grid.children)
        if (child instanceof HTMLElement) child.style.removeProperty("grid-row-end");
    };
  }, [enabled]);
  return ref;
}

/** How many tracks of at least `min` px (with `gap` between) fit in an element. */
export function useTrackCount<T extends HTMLElement>(min: (width: number) => number, gap: number) {
  const ref = useRef<T>(null);
  const [count, setCount] = useState<number | null>(null);
  const minRef = useRef(min);
  minRef.current = min;
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const measure = () => {
      const width = element.clientWidth;
      setCount(Math.max(1, Math.floor((width + gap) / (minRef.current(width) + gap))));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, [gap]);
  return [ref, count] as const;
}
