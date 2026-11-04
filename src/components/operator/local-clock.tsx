"use client";
import { useEffect, useState } from "react";
import { getClientWidgetConfig } from "@/actions/services";
export function LocalClock({ itemId }: { itemId: string }) {
  const [now, setNow] = useState<Date | null>(null);
  const [config, setConfig] = useState<{ timeZone?: string; format24h?: boolean }>({});
  useEffect(() => {
    let active = true;
    getClientWidgetConfig(itemId)
      .then((result) => {
        if (active) setConfig(result);
      })
      .catch(() => {});
    const tick = () => {
      if (document.visibilityState !== "hidden") setNow(new Date());
    };
    tick();
    const interval = setInterval(tick, 1000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      active = false;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [itemId]);
  if (!now) return <p>Loading local time…</p>;
  try {
    return (
      <div className="space-y-2">
        <time dateTime={now.toISOString()} className="block text-3xl font-medium tabular-nums">
          {now.toLocaleTimeString([], { timeZone: config.timeZone, hour12: !config.format24h })}
        </time>
        <p>{now.toLocaleDateString([], { timeZone: config.timeZone, dateStyle: "full" })}</p>
        <p className="text-xs text-muted-foreground">
          {config.timeZone || Intl.DateTimeFormat().resolvedOptions().timeZone}
        </p>
      </div>
    );
  } catch {
    return <p role="status">The configured timezone is invalid. Update the service settings.</p>;
  }
}
