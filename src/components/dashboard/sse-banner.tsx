"use client";

import React from "react";
import { useSseState } from "@/hooks/use-live-data";

export function SseBanner() {
  const sseState = useSseState();
  const [visible, setVisible] = React.useState(false);
  const hasConnectedRef = React.useRef(false);

  React.useEffect(() => {
    if (sseState === "connected") {
      hasConnectedRef.current = true;
      setVisible(false);
      return;
    }
    if (!hasConnectedRef.current) return;
    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [sseState]);

  if (!visible) return null;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-50 flex justify-center">
      <div className="pointer-events-auto mt-2 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-medium text-white shadow-lg">
        Reconnecting...
      </div>
    </div>
  );
}
