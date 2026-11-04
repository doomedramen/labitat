"use client";
import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { ServiceMetric } from "@/lib/service-presentation";
import type { HistoryRange, HistoryResponse } from "@/lib/history-types";
import { Button } from "@/components/ui/button";
const time = (timestamp: number) =>
  new Date(timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
export default function HistoryPanel({
  itemId,
  metrics,
}: {
  itemId: string;
  metrics: ServiceMetric[];
}) {
  const numeric = metrics.filter((metric) => metric.numericValue !== undefined);
  const [metricId, setMetricId] = useState(numeric[0]?.id ?? "");
  const [range, setRange] = useState<HistoryRange>("1h");
  const [data, setData] = useState<HistoryResponse | null>(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const numericIds = numeric.map((metric) => metric.id).join("\0");
  useEffect(() => {
    if (!numericIds.split("\0").includes(metricId)) setMetricId(numericIds.split("\0")[0] ?? "");
  }, [numericIds, metricId]);
  useEffect(() => {
    let generation = 0;
    let disposed = false;
    let controller: AbortController | undefined;
    let timer: ReturnType<typeof setInterval> | undefined;
    setData(null);
    setError(false);
    async function refresh() {
      if (document.visibilityState === "hidden") return;
      const attempt = ++generation;
      controller?.abort();
      controller = new AbortController();
      try {
        const query = new URLSearchParams({ range });
        if (metricId) query.set("metric", metricId);
        const response = await fetch(`/api/items/${encodeURIComponent(itemId)}/history?${query}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("History unavailable");
        const result = (await response.json()) as HistoryResponse;
        if (!disposed && attempt === generation) {
          setData(result);
          setError(false);
        }
      } catch (cause) {
        if (
          !disposed &&
          attempt === generation &&
          !(cause instanceof DOMException && cause.name === "AbortError")
        )
          setError(true);
      }
    }
    function visibility() {
      clearInterval(timer);
      if (document.visibilityState !== "hidden") {
        void refresh();
        timer = setInterval(refresh, 60000);
      }
    }
    visibility();
    document.addEventListener("visibilitychange", visibility);
    return () => {
      disposed = true;
      controller?.abort();
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [itemId, metricId, range, retry]);
  const metric = numeric.find((metric) => metric.id === metricId);
  const hasPoints = data?.points.some((point) => point.value !== null);
  return (
    <section aria-label="Service history" className="space-y-3">
      <h3 className="text-sm font-medium">History</h3>
      <div className="flex flex-wrap items-end gap-3">
        {!!numeric.length && (
          <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs text-muted-foreground">
            Metric
            <select
              aria-label="History metric"
              className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
              value={metricId}
              onChange={(event) => setMetricId(event.target.value)}
            >
              {numeric.map((metric) => (
                <option key={metric.id} value={metric.id}>
                  {metric.label}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="flex flex-col gap-1 text-xs text-muted-foreground">
          Range
          <select
            aria-label="History range"
            className="h-9 rounded-md border border-input bg-card px-2 text-sm text-foreground"
            value={range}
            onChange={(event) => setRange(event.target.value as HistoryRange)}
          >
            <option value="1h">1 hour</option>
            <option value="6h">6 hours</option>
            <option value="24h">24 hours</option>
          </select>
        </label>
      </div>
      {error ? (
        <div role="status" className="text-sm text-destructive">
          History unavailable.{" "}
          <Button variant="outline" onClick={() => setRetry((value) => value + 1)}>
            Retry
          </Button>
        </div>
      ) : !data ? (
        <p role="status" className="text-sm text-muted-foreground">
          Loading history…
        </p>
      ) : hasPoints ? (
        <>
          <p className="text-xs text-muted-foreground">
            {metric?.label} · {data.unit}
          </p>
          <div
            role="img"
            aria-label={`${metric?.label ?? metricId} history over ${range}; gaps indicate missing observations`}
            className="h-44 w-full min-w-0"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.points} margin={{ left: 0, right: 10, top: 5, bottom: 0 }}>
                <XAxis
                  dataKey="timestamp"
                  tickFormatter={time}
                  minTickGap={70}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  width={44}
                  tick={{ fill: "var(--muted-foreground)", fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip
                  labelFormatter={(value) => new Date(Number(value)).toLocaleString()}
                  contentStyle={{
                    background: "var(--popover)",
                    color: "var(--popover-foreground)",
                    border: "1px solid var(--border)",
                  }}
                />
                <Line
                  dataKey="value"
                  name={metric?.label ?? metricId}
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                  dot={false}
                  connectNulls={false}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted-foreground">
            One-minute samples · {Intl.DateTimeFormat().resolvedOptions().timeZone}
          </p>
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          No numeric observations yet. History starts with successful checks.
        </p>
      )}
      {!!data?.transitions.length && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-muted-foreground">Health changes</h4>
          <ol className="space-y-2 text-xs">
            {data.transitions.map((event, index) => (
              <li key={`${event.timestamp}-${index}`} className="flex gap-3">
                <time
                  dateTime={new Date(event.timestamp).toISOString()}
                  className="shrink-0 tabular-nums text-muted-foreground"
                >
                  {time(event.timestamp)}
                </time>
                <span>
                  {event.state}
                  {event.reason ? ` · ${event.reason}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
