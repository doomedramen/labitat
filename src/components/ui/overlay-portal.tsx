"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

type OverlaySlot = "top" | "bottom";

const SLOT_ELEMENT_ID: Record<OverlaySlot, string> = {
  top: "app-overlay-top",
  bottom: "app-overlay-bottom",
};

export function OverlayPortal({ slot, children }: { slot: OverlaySlot; children: ReactNode }) {
  const [target, setTarget] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setTarget(document.getElementById(SLOT_ELEMENT_ID[slot]) as HTMLElement | null);
  }, [slot]);

  if (target == null) return null;
  return createPortal(children, target);
}
