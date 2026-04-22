"use client";

import { useEffect, useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { Wifi, WifiOff, RefreshCw } from "lucide-react";
import { useSseState, useLastUpdateAt } from "@/hooks/use-live-data";

interface FooterProps {
  editMode: boolean;
}

export function Footer({ editMode }: FooterProps) {
  const sseState = useSseState();
  const lastUpdateAt = useLastUpdateAt();
  const [mounted, setMounted] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Re-render every 10 seconds to update the "time ago" text
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  // Don't render in edit mode
  if (editMode) {
    return null;
  }

  const isConnected = sseState === "connected";

  // Generate sync text based on connection state and last update time
  let syncText: string;
  if (!mounted) {
    syncText = "Loading...";
  } else if (!isConnected) {
    syncText = "Reconnecting...";
  } else if (lastUpdateAt === 0) {
    syncText = "Waiting for data...";
  } else {
    syncText = `Last synced ${formatDistanceToNow(lastUpdateAt, { addSuffix: true })}`;
  }

  return (
    <footer className="mt-12 flex items-center justify-center gap-4 py-4 text-xs text-muted-foreground/60">
      <div className="flex items-center gap-1.5">
        {isConnected ? (
          <Wifi className="h-3 w-3 text-green-500" />
        ) : (
          <WifiOff className="h-3 w-3 text-amber-500" />
        )}
        <span>{isConnected ? "Live" : "Reconnecting..."}</span>
      </div>
      <span className="text-muted-foreground/30">|</span>
      <div className="flex items-center gap-1.5">
        <RefreshCw className="h-3 w-3" />
        <span key={tick}>{syncText}</span>
      </div>
    </footer>
  );
}
