"use client";

import {
  Pause,
  Play,
  Download,
  Upload,
  AlertCircle,
  Clock,
  Hourglass,
  Loader2,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useIsMobile } from "@/hooks/use-mobile";
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

const BADGE: Record<
  string,
  {
    icon: "play" | "pause" | "download" | "import" | "error" | "queued" | "stalled" | "fetch";
    label: string;
    className: string;
  }
> = {
  Downloading: {
    icon: "download",
    label: "DL",
    className: "bg-primary/15 text-primary dark:bg-primary/25",
  },
  "Forced downloading": {
    icon: "download",
    label: "DL",
    className: "bg-primary/15 text-primary dark:bg-primary/25",
  },
  Importing: {
    icon: "import",
    label: "IMP",
    className: "bg-chart-2/20 text-chart-2 dark:bg-chart-2/30",
  },
  Queued: { icon: "queued", label: "Q", className: "bg-muted text-muted-foreground" },
  Stalled: {
    icon: "stalled",
    label: "ST",
    className: "bg-chart-5/20 text-chart-5 dark:bg-chart-5/30",
  },
  Paused: { icon: "pause", label: "⏸", className: "bg-muted text-muted-foreground" },
  "Fetching metadata": {
    icon: "fetch",
    label: "FT",
    className: "bg-chart-4/20 text-chart-4 dark:bg-chart-4/30",
  },
  "Import pending": {
    icon: "import",
    label: "IP",
    className: "bg-chart-2/20 text-chart-2 dark:bg-chart-2/30",
  },
  "Failed pending": {
    icon: "error",
    label: "FP",
    className: "bg-destructive/15 text-destructive dark:bg-destructive/25",
  },
  Failed: {
    icon: "error",
    label: "ERR",
    className: "bg-destructive/15 text-destructive dark:bg-destructive/25",
  },
  playing: { icon: "play", label: "▶", className: "bg-chart-1/20 text-chart-1 dark:bg-chart-1/30" },
  paused: { icon: "pause", label: "⏸", className: "bg-muted text-muted-foreground" },
};

const PROGRESS_COLOR: Record<string, string> = {
  Downloading: "bg-primary",
  "Forced downloading": "bg-primary",
  Importing: "bg-chart-2",
  Queued: "bg-muted-foreground/40",
  Stalled: "bg-chart-5",
  Paused: "bg-muted-foreground/40",
  "Fetching metadata": "bg-chart-4",
  "Import pending": "bg-chart-2",
  "Failed pending": "bg-destructive",
  Failed: "bg-destructive",
  playing: "bg-chart-1",
  paused: "bg-muted-foreground/40",
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

function BadgeIcon({ icon, className }: { icon: string; className?: string }) {
  switch (icon) {
    case "play":
      return <Play className={cn("w-3 h-3", className)} />;
    case "pause":
      return <Pause className={cn("w-3 h-3", className)} />;
    case "download":
      return <Download className={cn("w-3 h-3", className)} />;
    case "import":
      return <Upload className={cn("w-3 h-3", className)} />;
    case "queued":
      return <Clock className={cn("w-3 h-3", className)} />;
    case "stalled":
      return <Hourglass className={cn("w-3 h-3", className)} />;
    case "fetch":
      return <Loader2 className={cn("w-3 h-3", className)} />;
    case "error":
      return <AlertCircle className={cn("w-3 h-3", className)} />;
    default:
      return null;
  }
}

// ─── Marquee ──────────────────────────────────────────────────────────────────

function MarqueeText({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("overflow-hidden flex-1 min-w-0", className)}>
      <span className="truncate block h-[18px] leading-none">{text}</span>
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
  const colorClass = PROGRESS_COLOR[item.activity] ?? "bg-stone-400";
  return (
    <div className="w-[215px] p-0">
      <p className="text-[11.5px] font-medium leading-snug break-all mb-[5px]">{item.title}</p>
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
      {item.subtitle && <TRow label="Series / Artist" value={item.subtitle} />}
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
  const download = item.kind === "download" ? item : null;
  const media = item.kind === "media" ? item : null;

  const titleText =
    download?.title ??
    (media?.subtitle ? `${media.subtitle} — ${media.title}` : media?.title) ??
    "";

  const statusKey = download?.activity ?? media?.state ?? "Queued";
  const badge = BADGE[statusKey];
  const progressColor = PROGRESS_COLOR[statusKey] ?? "bg-stone-400";

  const progressPct =
    download?.progress ??
    (media && media.duration > 0 ? (media.progress / media.duration) * 100 : 0);

  const metaText = download
    ? [download.timeLeft && download.timeLeft !== "0m" ? download.timeLeft : null, download.size]
        .filter(Boolean)
        .join(" · ")
    : media
      ? `${formatTime(media.progress)} / ${formatTime(media.duration)}`
      : "";

  const subText = download?.activity ?? "";
  const isMobile = useIsMobile();

  return (
    <TooltipProvider delayDuration={isMobile ? 0 : 600}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className="flex flex-col bg-background border border-border rounded-lg overflow-hidden cursor-default hover:border-border/60 transition-colors"
            role="listitem"
            aria-label={titleText}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
          >
            <div className="px-2 pt-[6px] pb-[5px] flex flex-col gap-[3px] overflow-hidden">
              <div className="flex items-center gap-[5px] h-[18px] min-w-0">
                <MarqueeText text={titleText} className="text-[12px] font-medium text-foreground" />
                {badge && (
                  <span
                    className={cn(
                      "w-[18px] h-[18px] flex items-center justify-center rounded-[3px] whitespace-nowrap flex-shrink-0",
                      badge.className,
                    )}
                  >
                    <BadgeIcon icon={badge.icon} className="w-3 h-3" />
                  </span>
                )}
              </div>

              <div className="flex items-center gap-[5px] h-[18px] min-w-0">
                {media && (
                  <div className="w-[14px] h-[14px] rounded-full bg-primary/15 text-primary dark:bg-primary/25 text-[8px] font-medium flex items-center justify-center flex-shrink-0 leading-none self-center">
                    {initials(media.user)}
                  </div>
                )}
                {media ? (
                  <MarqueeText text={media.user} className="text-[11px] text-muted-foreground" />
                ) : (
                  <MarqueeText text={subText} className="text-[11px] text-muted-foreground" />
                )}
                <span className="text-[11px] text-muted-foreground/70 whitespace-nowrap flex-shrink-0 leading-none">
                  {metaText}
                </span>
              </div>
            </div>

            <div className="h-[3px] bg-transparent flex-shrink-0">
              <div className={cn("h-full", progressColor)} style={{ width: `${progressPct}%` }} />
            </div>
          </div>
        </TooltipTrigger>

        <TooltipContent side="top" className="p-2 shadow-md border">
          {download ? (
            <DownloadTooltip item={download} />
          ) : media ? (
            <MediaTooltip item={media} />
          ) : null}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
