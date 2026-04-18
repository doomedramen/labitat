"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ActivityState =
  | "Downloading"
  | "Forced downloading"
  | "Importing"
  | "Queued"
  | "Stalled"
  | "Paused"
  | "Fetching metadata"
  | "Import pending"
  | "Failed pending"
  | "Failed";

export type MediaState = "playing" | "paused";

export interface DownloadItem {
  kind: "download";
  title: string;
  subtitle?: string;
  progress: number;
  timeLeft?: string;
  activity: ActivityState;
  size?: string;
}

export interface MediaItem {
  kind: "media";
  title: string;
  subtitle?: string;
  user: string;
  progress: number;
  duration: number;
  state: MediaState;
  streamId?: string;
  transcoding?: {
    isDirect?: boolean;
    hardwareDecoding?: boolean;
    hardwareEncoding?: boolean;
  };
}

export type ListItemData = DownloadItem | MediaItem;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const BADGE: Record<string, { label: string; className: string }> = {
  Downloading: {
    label: "DL",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  "Forced downloading": {
    label: "DL",
    className: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  },
  Importing: {
    label: "IMP",
    className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  Queued: {
    label: "Q",
    className: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
  },
  Stalled: {
    label: "ST",
    className: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  },
  Paused: {
    label: "⏸",
    className: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
  },
  "Fetching metadata": {
    label: "FT",
    className: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  },
  "Import pending": {
    label: "IP",
    className: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  },
  "Failed pending": {
    label: "FP",
    className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  },
  Failed: { label: "ERR", className: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" },
  playing: {
    label: "▶",
    className: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  },
  paused: {
    label: "⏸",
    className: "bg-stone-100 text-stone-500 dark:bg-stone-800 dark:text-stone-400",
  },
};

const PROGRESS_COLOR: Record<string, string> = {
  Downloading: "bg-blue-500",
  "Forced downloading": "bg-blue-500",
  Importing: "bg-green-500",
  Queued: "bg-stone-400",
  Stalled: "bg-amber-500",
  Paused: "bg-stone-400",
  "Fetching metadata": "bg-purple-500",
  "Import pending": "bg-green-500",
  "Failed pending": "bg-red-500",
  Failed: "bg-red-500",
  playing: "bg-teal-500",
  paused: "bg-stone-400",
};

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function initials(name: string): string {
  return name.slice(0, 1).toUpperCase();
}

// ─── Marquee ──────────────────────────────────────────────────────────────────

function MarqueeText({ text, className }: { text: string; className?: string }) {
  const clipRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLSpanElement>(null);
  const [shift, setShift] = useState<number | null>(null);
  const [dur, setDur] = useState(8);

  const measure = useCallback(() => {
    const clip = clipRef.current;
    const inner = innerRef.current;
    if (!clip || !inner) return;
    const overflow = inner.scrollWidth - clip.clientWidth;
    if (overflow > 4) {
      setShift(overflow + 16);
      setDur(Math.max(4, overflow / 30));
    } else {
      setShift(null);
    }
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (clipRef.current) ro.observe(clipRef.current);
    return () => ro.disconnect();
  }, [measure, text]);

  return (
    <div ref={clipRef} className="overflow-hidden flex-1 min-w-0 flex items-center h-[18px]">
      <span
        ref={innerRef}
        className={cn("inline-block whitespace-nowrap leading-none", className)}
        style={
          shift !== null
            ? {
                animation: `mq-scroll ${dur}s linear 1s infinite`,
                ["--mq-shift" as string]: `-${shift}px`,
              }
            : undefined
        }
      >
        {text}
      </span>
    </div>
  );
}

// ─── Tooltip rows ─────────────────────────────────────────────────────────────

function TRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 text-[11px] py-[1.5px]">
      <span className="text-muted-foreground whitespace-nowrap">{label}</span>
      <span className="font-medium text-right break-words max-w-[120px]">{value}</span>
    </div>
  );
}

function TProgress({ pct, colorClass }: { pct: number; colorClass: string }) {
  return (
    <div className="mt-[5px] mb-[2px]">
      <TRow label="Progress" value={`${Math.round(pct)}%`} />
      <div className="h-[3px] bg-border rounded-full overflow-hidden mt-[3px]">
        <div className={cn("h-full rounded-full", colorClass)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Download tooltip ─────────────────────────────────────────────────────────

function DownloadTooltip({ item }: { item: DownloadItem }) {
  const fullTitle = item.subtitle ? `${item.subtitle} — ${item.title}` : item.title;
  const colorClass = PROGRESS_COLOR[item.activity] ?? "bg-stone-400";
  return (
    <div className="w-[215px] p-0">
      <p className="text-[11.5px] font-medium leading-snug break-all mb-[5px]">{fullTitle}</p>
      <div className="h-px bg-border my-1" />
      {item.subtitle && <TRow label="Series" value={item.subtitle} />}
      {item.subtitle && <TRow label="Episode" value={item.title} />}
      <TRow label="Status" value={item.activity} />
      {item.size && <TRow label="Size" value={item.size} />}
      {item.timeLeft && <TRow label="Time left" value={item.timeLeft} />}
      <TProgress pct={item.progress} colorClass={colorClass} />
    </div>
  );
}

// ─── Media tooltip ─────────────────────────────────────────────────────────────

function MediaTooltip({ item }: { item: MediaItem }) {
  const fullTitle = item.subtitle ? `${item.subtitle} — ${item.title}` : item.title;
  const pct = item.duration > 0 ? (item.progress / item.duration) * 100 : 0;
  const colorClass = PROGRESS_COLOR[item.state];
  const tc = item.transcoding;
  return (
    <div className="w-[215px] p-0">
      <p className="text-[11.5px] font-medium leading-snug break-all mb-[5px]">{fullTitle}</p>
      <div className="h-px bg-border my-1" />
      {item.subtitle && (
        <TRow
          label={item.kind === "media" ? "Series / Artist" : "Subtitle"}
          value={item.subtitle}
        />
      )}
      <TRow label="User" value={item.user} />
      <TRow label="State" value={item.state === "playing" ? "Playing" : "Paused"} />
      <TRow label="Duration" value={formatTime(item.duration)} />
      {tc && (
        <>
          <TRow label="Stream" value={tc.isDirect ? "Direct play" : "Transcoding"} />
          <TRow label="HW decode" value={tc.hardwareDecoding ? "Yes" : "No"} />
          <TRow label="HW encode" value={tc.hardwareEncoding ? "Yes" : "No"} />
        </>
      )}
      {item.streamId && <TRow label="Stream ID" value={item.streamId} />}
      <div className="mt-[5px] mb-[2px]">
        <TRow
          label="Progress"
          value={`${formatTime(item.progress)} / ${formatTime(item.duration)}`}
        />
        <div className="h-[3px] bg-border rounded-full overflow-hidden mt-[3px]">
          <div className={cn("h-full rounded-full", colorClass)} style={{ width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ListItem({ item }: { item: ListItemData }) {
  const isDownload = item.kind === "download";
  const isMedia = item.kind === "media";

  const titleText = isDownload
    ? item.subtitle
      ? `${item.subtitle} ${item.title}`
      : item.title
    : item.subtitle
      ? `${item.subtitle} ${item.title}`
      : item.title;

  const statusKey = isDownload ? (item as DownloadItem).activity : (item as MediaItem).state;
  const badge = BADGE[statusKey];
  const progressColor = PROGRESS_COLOR[statusKey] ?? "bg-stone-400";

  const progressPct = isDownload
    ? (item as DownloadItem).progress
    : (() => {
        const p = item as MediaItem;
        return p.duration > 0 ? (p.progress / p.duration) * 100 : 0;
      })();

  const metaText = isDownload
    ? [
        (item as DownloadItem).timeLeft && (item as DownloadItem).timeLeft !== "0m"
          ? (item as DownloadItem).timeLeft
          : null,
        (item as DownloadItem).size,
      ]
        .filter(Boolean)
        .join(" · ")
    : (() => {
        const p = item as MediaItem;
        return `${formatTime(p.progress)} / ${formatTime(p.duration)}`;
      })();

  const subText = isDownload ? (item as DownloadItem).activity : null;

  return (
    <TooltipProvider delayDuration={600}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col bg-background border border-border rounded-lg overflow-hidden cursor-default hover:border-border/60 transition-colors">
            <div className="px-2 pt-[6px] pb-[5px] flex flex-col gap-[3px] overflow-hidden">
              <div className="flex items-center gap-[5px] h-[18px] min-w-0">
                <MarqueeText text={titleText} className="text-[12px] font-medium text-foreground" />
                {badge && (
                  <span
                    className={cn(
                      "text-[9.5px] font-medium px-[5px] py-[2px] rounded-[3px] whitespace-nowrap flex-shrink-0 leading-none",
                      badge.className,
                    )}
                  >
                    {badge.label}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-[5px] h-[18px] min-w-0">
                {isMedia && (
                  <div className="w-[14px] h-[14px] rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 text-[8px] font-medium flex items-center justify-center flex-shrink-0 leading-none">
                    {initials((item as MediaItem).user)}
                  </div>
                )}
                {isMedia ? (
                  <MarqueeText
                    text={(item as MediaItem).user}
                    className="text-[11px] text-muted-foreground"
                  />
                ) : (
                  <MarqueeText text={subText ?? ""} className="text-[11px] text-muted-foreground" />
                )}
                <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap flex-shrink-0 leading-none">
                  {metaText}
                </span>
              </div>
            </div>

            <div className="h-[3px] bg-border flex-shrink-0">
              <div className={cn("h-full", progressColor)} style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </TooltipTrigger>

        <TooltipContent side="top" className="p-2 shadow-md">
          {isDownload ? (
            <DownloadTooltip item={item as DownloadItem} />
          ) : (
            <MediaTooltip item={item as MediaItem} />
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
