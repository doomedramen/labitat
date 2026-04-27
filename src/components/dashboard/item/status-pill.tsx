"use client";

import { useRef, useLayoutEffect, useCallback } from "react";
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

// ─── Map status variant to theme semantic color name ─────────────────────────────────

function getSemanticColorName(status: StatusVariant): string {
  switch (status) {
    case "online":
      return "success";
    case "warning":
      return "warning";
    case "error":
      return "error";
    case "info":
      return "info";
    case "stale":
      return "muted";
  }
}

// ─── Pill outline path ────────────────────────────────────────────────────────────────

/** Builds a pill-shaped SVG path that traces the outer edge of the component. */
function pillPath(w: number, h: number, gap: number): string {
  const r = h / 2 + gap;
  const W = w + gap * 2;
  const H = h + gap * 2;
  const x = -gap;
  const y = -gap;
  return [
    `M ${x + W / 2} ${y}`,
    `L ${x + W - r} ${y}`,
    `A ${r} ${r} 0 0 1 ${x + W - r} ${y + H}`,
    `L ${x + r} ${y + H}`,
    `A ${r} ${r} 0 0 1 ${x + r} ${y}`,
    `Z`,
  ].join(" ");
}

// ─── Component ────────────────────────────────────────────────────────────────

const STROKE_WIDTH = 1.5;
const GAP = STROKE_WIDTH / 2 + 1.5;

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

  const semanticColor = getSemanticColorName(status);

  // Use theme CSS variables for colors
  const bgVar = "--color-bg-surface";
  const textVar = "--color-text-primary";
  const dotColor = `var(--color-semantic-${semanticColor})`;
  // Track uses a subtle border color (much more muted than the progress stroke)
  const trackColor = `var(--color-border-default)`;
  const progressColor = `var(--color-semantic-${semanticColor})`;

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
    }
  }, []);

  // Update stroke-dashoffset separately for smooth animation
  useLayoutEffect(() => {
    const progPath = progressPathRef.current;
    const trackPath = pathRef.current;
    if (!progPath || !trackPath) return;

    const len = trackPath.getTotalLength();
    progPath.setAttribute("stroke-dasharray", String(len));
    progPath.setAttribute("stroke-dashoffset", String(len * (1 - clampedProgress)));
  }, [clampedProgress]);

  useLayoutEffect(() => {
    syncGeometry();
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
          height: 18,
          padding: "0 4px",
          borderRadius: 9,
          background: `var(${bgVar})`,
          color: `var(${textVar})`,
          fontSize: 11,
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
        {/* Track (full pill outline, subtle) */}
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
