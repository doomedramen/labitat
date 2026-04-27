"use client";

import { useRef, useLayoutEffect, useState, useCallback } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusVariant = "online" | "warning" | "error" | "stale" | "info";

export interface StatusPillProps {
  /** Current service status */
  status: StatusVariant;
  /** Label shown inside the pill */
  text: string;
  /**
   * Countdown progress from 0→1.
   * 0 = just updated / no stroke (use for SSR/stale state).
   * 1 = next SSE event is imminent (full outline).
   */
  progress?: number;
  className?: string;
  /** Optional tooltip content */
  tooltip?: React.ReactNode;
}

// ─── Token maps ───────────────────────────────────────────────────────────────

const tokens: Record<
  StatusVariant,
  {
    bg: string;
    text: string;
    dot: string;
    track: string;
    progress: string;
    darkBg: string;
    darkText: string;
    darkDot: string;
    darkTrack: string;
    darkProgress: string;
  }
> = {
  online: {
    bg: "#EAF3DE",
    text: "#3B6D11",
    dot: "#639922",
    track: "#C0DD97",
    progress: "#639922",
    darkBg: "#27500A",
    darkText: "#C0DD97",
    darkDot: "#97C459",
    darkTrack: "#3B6D11",
    darkProgress: "#97C459",
  },
  warning: {
    bg: "#FAEEDA",
    text: "#854F0B",
    dot: "#BA7517",
    track: "#FAC775",
    progress: "#BA7517",
    darkBg: "#633806",
    darkText: "#FAC775",
    darkDot: "#EF9F27",
    darkTrack: "#854F0B",
    darkProgress: "#EF9F27",
  },
  error: {
    bg: "#FCEBEB",
    text: "#A32D2D",
    dot: "#E24B4A",
    track: "#F7C1C1",
    progress: "#E24B4A",
    darkBg: "#791F1F",
    darkText: "#F7C1C1",
    darkDot: "#F09595",
    darkTrack: "#A32D2D",
    darkProgress: "#F09595",
  },
  stale: {
    bg: "#F1EFE8",
    text: "#5F5E5A",
    dot: "#888780",
    track: "#D3D1C7",
    progress: "#888780",
    darkBg: "#444441",
    darkText: "#D3D1C7",
    darkDot: "#B4B2A9",
    darkTrack: "#5F5E5A",
    darkProgress: "#D3D1C7",
  },
  info: {
    bg: "#E6F1FB",
    text: "#185FA5",
    dot: "#378ADD",
    track: "#B5D4F4",
    progress: "#378ADD",
    darkBg: "#0C447C",
    darkText: "#B5D4F4",
    darkDot: "#85B7EB",
    darkTrack: "#185FA5",
    darkProgress: "#85B7EB",
  },
};

// ─── Pill outline path ────────────────────────────────────────────────────────

/** Builds a pill-shaped SVG path that traces the outer edge of the component.
 *  Starts at the top-center and goes clockwise so dashoffset fills left→right. */
function pillPath(w: number, h: number, gap: number): string {
  const r = h / 2 + gap;
  const W = w + gap * 2;
  const H = h + gap * 2;
  const x = -gap;
  const y = -gap;
  // Start top-center, go clockwise
  return [
    `M ${x + W / 2} ${y}`,
    `L ${x + W - r} ${y}`,
    `A ${r} ${r} 0 0 1 ${x + W - r} ${y + H}`,
    `L ${x + r} ${y + H}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    `Z`,
  ].join(" ");
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

function usePrefersDark(): boolean {
  const [dark, setDark] = useState(
    () =>
      typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches,
  );
  useLayoutEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = (e: MediaQueryListEvent) => setDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return dark;
}

// ─── Component ────────────────────────────────────────────────────────────────

const STROKE_WIDTH = 2.5;
const GAP = STROKE_WIDTH / 2 + 1.5; // gap between pill bg and stroke

export function StatusPill({
  status,
  text,
  progress = 0,
  className = "",
  tooltip,
}: StatusPillProps) {
  const innerRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const progressPathRef = useRef<SVGPathElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dark = usePrefersDark();

  const t = tokens[status];
  const bg = dark ? t.darkBg : t.bg;
  const textColor = dark ? t.darkText : t.text;
  const dotColor = dark ? t.darkDot : t.dot;
  const trackColor = dark ? t.darkTrack : t.track;
  const progressColor = dark ? t.darkProgress : t.progress;

  const clampedProgress = Math.max(0, Math.min(1, progress));
  const showStroke = clampedProgress > 0;
  const showPulse = status !== "stale";

  // Measure pill and update SVG geometry
  const syncGeometry = useCallback(() => {
    const inner = innerRef.current;
    const svg = svgRef.current;
    const trackPath = pathRef.current;
    const progPath = progressPathRef.current;
    if (!inner || !svg || !trackPath) return;

    const w = inner.offsetWidth;
    const h = inner.offsetHeight;
    const svgW = w + GAP * 2;
    const svgH = h + GAP * 2;

    svg.setAttribute("viewBox", `${-GAP} ${-GAP} ${svgW} ${svgH}`);
    svg.style.width = `${svgW}px`;
    svg.style.height = `${svgH}px`;
    svg.style.left = `${-GAP}px`;
    svg.style.top = `${-GAP}px`;

    const d = pillPath(w, h, GAP);
    trackPath.setAttribute("d", d);
    if (progPath) {
      progPath.setAttribute("d", d);
      const len = trackPath.getTotalLength();
      progPath.setAttribute("stroke-dasharray", String(len));
      progPath.setAttribute("stroke-dashoffset", String(len * (1 - clampedProgress)));
    }
  }, [clampedProgress]);

  useLayoutEffect(() => {
    syncGeometry();
    // Re-sync on resize (e.g. text changes)
    if (!innerRef.current) return;
    const ro = new ResizeObserver(syncGeometry);
    ro.observe(innerRef.current);
    return () => ro.disconnect();
  }, [syncGeometry, text, status]);

  const pillContent = (
    <div
      className={className}
      style={{ position: "relative", display: "inline-flex", alignItems: "center" }}
      role="status"
      aria-label={`${text} — ${status}`}
    >
      {/* Pill background */}
      <div
        ref={innerRef}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          height: 28,
          padding: "0 10px",
          borderRadius: 14,
          background: bg,
          color: textColor,
          fontSize: 12,
          fontWeight: 500,
          whiteSpace: "nowrap",
          userSelect: "none",
          position: "relative",
          zIndex: 1,
          transition: "background 0.2s, color 0.2s",
        }}
      >
        {/* Status dot */}
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: dotColor,
            flexShrink: 0,
            transition: "background 0.2s",
            animation: showPulse ? "statusPulse 2s ease-in-out infinite" : "none",
          }}
        />
        {text}
      </div>

      {/* SVG stroke overlay */}
      <svg
        ref={svgRef}
        aria-hidden="true"
        style={{
          position: "absolute",
          pointerEvents: "none",
          overflow: "visible",
        }}
      >
        {/* Track (full pill outline, muted) */}
        <path
          ref={pathRef}
          fill="none"
          stroke={trackColor}
          strokeWidth={STROKE_WIDTH}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ transition: "stroke 0.2s" }}
        />

        {/* Progress stroke */}
        {showStroke && (
          <path
            ref={progressPathRef}
            fill="none"
            stroke={progressColor}
            strokeWidth={STROKE_WIDTH}
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              transition: "stroke-dashoffset 0.4s ease, stroke 0.2s",
            }}
          />
        )}
      </svg>

      {/* Pulse keyframe — injected once */}
      <style>{`
        @keyframes statusPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.45; transform: scale(0.8); }
        }
      `}</style>
    </div>
  );

  if (!tooltip) return pillContent;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex cursor-default" onClick={(e) => e.stopPropagation()}>
            {pillContent}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" sideOffset={4} className="p-0 shadow-lg">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default StatusPill;
