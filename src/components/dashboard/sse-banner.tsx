"use client";

import React from "react";
import { useLiveMeta } from "@/components/dashboard/use-item-live";
import { OverlayPortal } from "@/components/ui/overlay-portal";

export function SseBanner() {
  const meta = useLiveMeta();
  const [visible, setVisible] = React.useState(false);
  const hasConnectedRef = React.useRef(false);

  React.useEffect(() => {
    if (meta.sseState === "connected") {
      hasConnectedRef.current = true;
      setVisible(false);
      return;
    }
    if (!hasConnectedRef.current) return;
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [meta.sseState]);

  if (!visible) return null;

  return (
    <OverlayPortal slot="top">
      <div
        data-testid="sse-banner"
        className="pointer-events-auto mt-2 rounded-full bg-danger/90 px-3 py-1 text-xs font-medium text-white shadow-lg"
      >
        Reconnecting...
      </div>
    </OverlayPortal>
  );
}
