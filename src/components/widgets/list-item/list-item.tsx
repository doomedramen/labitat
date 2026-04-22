"use client";

import * as React from "react";
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
  episode?: string;
  transcoding?: {
    isDirect?: boolean;
    hardwareDecoding?: boolean;
    hardwareEncoding?: boolean;
  };
}

export type ListItemData = DownloadItem | MediaItem;

// ─── Status Configuration ─────────────────────────────────────────────────────

interface StatusConfig {
  icon: "play" | "pause" | "download" | "import" | "error" | "queued" | "stalled" | "fetch";
  label: string;
  className: string;
  glowColor: string;
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  Downloading: {
    icon: "download",
    label: "DL",
    className: "bg-primary/15 text-primary dark:bg-primary/20",
    glowColor: "shadow-[0_0_8px_-2px_hsl(var(--primary)/0.4)]",
  },
  "Forced downloading": {
    icon: "download",
    label: "DL",
    className: "bg-primary/20 text-primary dark:bg-primary/30",
    glowColor: "shadow-[0_0_12px_-2px_hsl(var(--primary)/0.5)]",
  },
  Importing: {
    icon: "import",
    label: "IMP",
    className: "bg-success/15 text-success dark:bg-success/20",
    glowColor: "shadow-[0_0_8px_-2px_hsl(var(--success)/0.4)]",
  },
  Queued: {
    icon: "queued",
    label: "Q",
    className: "bg-muted/60 text-muted-foreground",
    glowColor: "",
  },
  Stalled: {
    icon: "stalled",
    label: "ST",
    className: "bg-warning/15 text-warning dark:bg-warning/20",
    glowColor: "shadow-[0_0_8px_-2px_hsl(var(--warning)/0.3)]",
  },
  Paused: {
    icon: "pause",
    label: "PA",
    className: "bg-muted/80 text-muted-foreground",
    glowColor: "",
  },
  "Fetching metadata": {
    icon: "fetch",
    label: "META",
    className: "bg-info/15 text-info dark:bg-info/20",
    glowColor: "shadow-[0_0_8px_-2px_hsl(var(--info)/0.4)]",
  },
  "Import pending": {
    icon: "import",
    label: "IP",
    className: "bg-success/15 text-success dark:bg-success/20",
    glowColor: "shadow-[0_0_8px_-2px_hsl(var(--success)/0.4)]",
  },
  "Failed pending": {
    icon: "error",
    label: "FP",
    className: "bg-destructive/15 text-destructive dark:bg-destructive/20",
    glowColor: "shadow-[0_0_8px_-2px_hsl(var(--destructive)/0.4)]",
  },
  Failed: {
    icon: "error",
    label: "ERR",
    className: "bg-destructive/20 text-destructive dark:bg-destructive/25",
    glowColor: "shadow-[0_0_10px_-2px_hsl(var(--destructive)/0.5)]",
  },
  playing: {
    icon: "play",
    label: "PLAY",
    className: "bg-success/15 text-success dark:bg-success/20",
    glowColor: "shadow-[0_0_8px_-2px_hsl(var(--success)/0.4)]",
  },
  paused: {
    icon: "pause",
    label: "PAUSE",
    className: "bg-muted/80 text-muted-foreground",
    glowColor: "",
  },
};

const PROGRESS_GRADIENTS = {
  active: "bg-gradient-to-r from-primary/60 via-primary/80 to-primary/60",
  success: "bg-gradient-to-r from-success/60 via-success/80 to-success/60",
  warning: "bg-gradient-to-r from-warning/60 via-warning/80 to-warning/60",
  error: "bg-gradient-to-r from-destructive/60 via-destructive/80 to-destructive/60",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function initials(name: string): string {
  return name.slice(0, 2).toUpperCase();
}

function BadgeIcon({ icon, className }: { icon: string; className?: string }) {
  const iconClass = cn("w-3 h-3", className);
  switch (icon) {
    case "play":
      return <Play className={iconClass} />;
    case "pause":
      return <Pause className={iconClass} />;
    case "download":
      return <Download className={iconClass} />;
    case "import":
      return <Upload className={iconClass} />;
    case "queued":
      return <Clock className={iconClass} />;
    case "stalled":
      return <Hourglass className={iconClass} />;
    case "fetch":
      return <Loader2 className={cn(iconClass, "animate-spin")} />;
    case "error":
      return <AlertCircle className={iconClass} />;
    default:
      return null;
  }
}

function getProgressGradient(activity: ActivityState | MediaState): string {
  if (activity === "Failed" || activity === "Failed pending") {
    return PROGRESS_GRADIENTS.error;
  }
  if (activity === "Importing" || activity === "Import pending" || activity === "playing") {
    return PROGRESS_GRADIENTS.success;
  }
  if (activity === "Stalled") {
    return PROGRESS_GRADIENTS.warning;
  }
  return PROGRESS_GRADIENTS.active;
}

// ─── Tooltip rows ─────────────────────────────────────────────────────────────

function TRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-2 text-[11px] py-[2px]">
      <span className="text-secondary-foreground/60 whitespace-nowrap">{label}</span>
      <span className="font-medium text-secondary-foreground text-right break-words max-w-[140px]">
        {value}
      </span>
    </div>
  );
}

function TProgress({ pct, gradient }: { pct: number; gradient: string }) {
  return (
    <div className="mt-2 mb-1">
      <TRow label="Progress" value={`${Math.round(pct)}%`} />
      <div className="h-[3px] bg-border/50 rounded-full overflow-hidden mt-1.5">
        <div
          className={cn("h-full rounded-full transition-all duration-300", gradient)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Download tooltip ─────────────────────────────────────────────────────────

function DownloadTooltip({ item }: { item: DownloadItem }) {
  const gradient = getProgressGradient(item.activity);
  return (
    <div className="w-[240px] p-0">
      <p className="text-xs font-medium leading-snug break-all mb-2 text-foreground">
        {item.title}
      </p>
      <div className="h-px bg-border/70 my-1.5" />
      {item.subtitle && <TRow label="Series" value={item.subtitle} />}
      {item.subtitle && <TRow label="Episode" value={item.title} />}
      <TRow label="Status" value={item.activity} />
      {item.size && <TRow label="Size" value={item.size} />}
      {item.timeLeft && <TRow label="Time left" value={item.timeLeft} />}
      <TProgress pct={item.progress} gradient={gradient} />
    </div>
  );
}

// ─── Media tooltip ─────────────────────────────────────────────────────────────

function MediaTooltip({ item }: { item: MediaItem }) {
  const fullTitle = item.subtitle
    ? `${item.subtitle} - ${item.title}`
    : (item.title ?? item.episode);
  const pct = item.duration > 0 ? (item.progress / item.duration) * 100 : 0;
  const gradient = getProgressGradient(item.state);
  const tc = item.transcoding;

  return (
    <div className="w-[240px] p-0">
      <p className="text-xs font-medium leading-snug break-all mb-2 text-foreground">{fullTitle}</p>
      <div className="h-px bg-border/70 my-1.5" />
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
      <div className="mt-2 mb-1">
        <TRow
          label="Progress"
          value={`${formatTime(item.progress)} / ${formatTime(item.duration)}`}
        />
        <div className="h-[3px] bg-border/50 rounded-full overflow-hidden mt-1.5">
          <div
            className={cn("h-full rounded-full transition-all duration-300", gradient)}
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function ListItem({ item }: { item: ListItemData }) {
  const [tooltipOpen, setTooltipOpen] = React.useState(false);

  const download = item.kind === "download" ? item : null;
  const media = item.kind === "media" ? item : null;

  const displayTitle =
    download?.title ??
    (media?.subtitle
      ? media.title
        ? `${media.subtitle} - ${media.title}`
        : media.episode
      : media?.title) ??
    "";

  const statusKey = download?.activity ?? media?.state ?? "Queued";
  const status = STATUS_CONFIG[statusKey];
  const gradient = getProgressGradient(statusKey as ActivityState | MediaState);

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

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isMobile && e.pointerType === "touch") {
      setTooltipOpen(true);
    }
  };

  const isActive =
    statusKey === "Downloading" ||
    statusKey === "Forced downloading" ||
    statusKey === "Importing" ||
    statusKey === "playing";

  return (
    <TooltipProvider delayDuration={isMobile ? 0 : 500}>
      <Tooltip open={isMobile ? tooltipOpen : undefined} onOpenChange={setTooltipOpen}>
        <TooltipTrigger asChild>
          <div
            className={cn(
              "group/listitem flex flex-col gap-2 rounded-xl p-3",
              "bg-gradient-to-b from-secondary/90 to-secondary/70",
              "border border-border/30",
              "hover:from-secondary hover:to-secondary/80",
              "hover:border-border/50 hover:shadow-sm",
              "transition-all duration-200 ease-out",
              "cursor-default",
            )}
            role="listitem"
            aria-label={displayTitle}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onPointerDown={handlePointerDown}
          >
            {/* Row 1: Title + Icon */}
            <div className="flex items-center gap-2 min-w-0">
              <span
                className={cn(
                  "truncate flex-1 text-[13px] font-semibold tracking-tight",
                  "text-secondary-foreground/90",
                  "group-hover/listitem:text-secondary-foreground",
                )}
              >
                {displayTitle}
              </span>
              {status && (
                <span
                  className={cn(
                    "w-6 h-5 flex items-center justify-center rounded-md",
                    "text-[10px] font-bold",
                    status.className,
                    isActive && status.glowColor,
                    "transition-all duration-200",
                    "flex-shrink-0",
                  )}
                >
                  <BadgeIcon icon={status.icon} />
                </span>
              )}
            </div>

            {/* Row 2: Activity/User + Meta */}
            <div className="flex items-center gap-2 min-w-0">
              {media && (
                <div
                  className={cn(
                    "w-5 h-5 rounded-full flex items-center justify-center",
                    "bg-gradient-to-br from-primary/20 to-primary/5",
                    "border border-primary/20",
                    "text-[9px] font-bold text-primary/80",
                    "flex-shrink-0",
                  )}
                >
                  {initials(media.user)}
                </div>
              )}
              <span className="truncate text-[11px] text-secondary-foreground/60 font-medium">
                {media ? media.user : subText}
              </span>
              {metaText && (
                <span className="text-[11px] text-secondary-foreground/50 whitespace-nowrap flex-shrink-0">
                  · {metaText}
                </span>
              )}
            </div>

            {/* Row 3: Progress bar */}
            <div className="h-1.5 bg-border/30 rounded-full overflow-hidden">
              <div
                className={cn("h-full rounded-full transition-all duration-500 ease-out", gradient)}
                style={{ width: `${Math.max(2, progressPct)}%` }}
              />
            </div>
          </div>
        </TooltipTrigger>

        <TooltipContent
          side="top"
          className={cn(
            "p-3 shadow-lg border border-border/50",
            "bg-popover/95 backdrop-blur-sm rounded-xl",
          )}
        >
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
