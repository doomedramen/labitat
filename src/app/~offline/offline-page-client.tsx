"use client";

import { useEffect, useState } from "react";

const HEALTH_CHECK_INTERVAL = 3_000;

export default function OfflinePageClient() {
  const [isDown, setIsDown] = useState(true);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch("/api/health");
        if (res.ok) {
          window.location.href = "/";
          return;
        }
      } catch {
        // server unreachable
      }
      setIsDown(true);
    };

    check();
    const id = setInterval(check, HEALTH_CHECK_INTERVAL);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-6xl">📡</div>
      <h1 className="text-2xl font-bold">Service unavailable</h1>
      <p className="text-muted-foreground">
        {isDown
          ? "We're having trouble reaching the server. We'll reconnect automatically."
          : "Reconnecting..."}
      </p>
    </div>
  );
}
