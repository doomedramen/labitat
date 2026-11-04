"use client";

import React from "react";
import { useLiveMeta } from "@/components/dashboard/use-item-live";
import { OverlayPortal } from "@/components/ui/overlay-portal";

export function SseBanner() {
  const meta = useLiveMeta();
  const connected = meta.sseState === "connected";
  const [visible, setVisible] = React.useState(false);

  React.useEffect(() => {
    if (connected) {
      setVisible(false);
      return;
    }
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [connected]);

  if (!visible) return null;

  return (
    <OverlayPortal slot="top">
      <div
        data-testid="sse-banner"
        role="status"
        className="pointer-events-auto mt-2 rounded-full bg-warning px-3 py-1 text-xs font-medium text-background shadow-lg"
      >
        Live updates unavailable. Reconnecting…
      </div>
    </OverlayPortal>
  );
}
