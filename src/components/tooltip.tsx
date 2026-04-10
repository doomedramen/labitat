"use client"

import * as React from "react"

// ── Tooltip store (single global tooltip, no context provider needed) ──

interface TooltipState {
  open: boolean
  content: React.ReactNode
  x: number
  y: number
  side: "top" | "bottom" | "left" | "right"
}

const tooltipStore = {
  state: {
    open: false,
    content: null,
    x: 0,
    y: 0,
    side: "top",
  } as TooltipState,
  listeners: new Set<() => void>(),
  set(next: Partial<TooltipState>) {
    Object.assign(this.state, next)
    for (const fn of this.listeners) fn()
  },
  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => {
      void this.listeners.delete(fn)
    }
  },
}

// ── Root-level tooltip renderer (place once in app layout) ──

export function TooltipRoot() {
  const [state, setState] = React.useState(tooltipStore.state)
  const [visible, setVisible] = React.useState(false)

  React.useEffect(() => {
    if (state.open) {
      // Trigger fade-in on next frame so the element is mounted first
      requestAnimationFrame(() => setVisible(true))
    } else {
      setVisible(false)
    }
  }, [state.open])

  if (!state.content) return null

  const arrowSize = 10

  // Position: fixed, no JS recalculation after initial placement
  const style: React.CSSProperties = {
    position: "fixed",
    left: state.side === "left" ? state.x - arrowSize : state.x,
    top: state.side === "top" ? state.y - arrowSize : state.y,
    transform:
      state.side === "top"
        ? "translate(-50%, -100%)"
        : state.side === "bottom"
          ? "translate(-50%, 0)"
          : state.side === "left"
            ? "translate(-100%, -50%)"
            : "translate(0, -50%)",
    zIndex: 9999,
    pointerEvents: "none",
    opacity: visible ? 1 : 0,
    transition: "opacity 150ms ease",
  }

  return (
    <div style={style} data-slot="custom-tooltip">
      <div className="rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-lg">
        {state.content}
      </div>
      {/* Arrow — SVG for clean rendering */}
      <svg
        className="absolute block fill-foreground"
        style={{
          width: 10,
          height: 5,
          left: "50%",
          top:
            state.side === "top"
              ? "100%"
              : state.side === "bottom"
                ? "auto"
                : "50%",
          bottom: state.side === "bottom" ? "100%" : "auto",
          right:
            state.side === "left"
              ? "100%"
              : state.side === "right"
                ? "auto"
                : "50%",
          transform:
            state.side === "top" || state.side === "bottom"
              ? "translateX(-50%)"
              : "translateY(-50%)",
          marginTop: state.side === "top" ? "-1px" : undefined,
          marginBottom: state.side === "bottom" ? "-1px" : undefined,
          marginLeft: state.side === "left" ? "-1px" : undefined,
          marginRight: state.side === "right" ? "-1px" : undefined,
        }}
        width="10"
        height="5"
        viewBox="0 0 30 10"
        preserveAspectRatio="none"
      >
        {state.side === "top" && <polygon points="0,0 30,0 15,10" />}
        {state.side === "bottom" && <polygon points="0,10 30,10 15,0" />}
        {state.side === "left" && <polygon points="0,0 10,5 0,10" />}
        {state.side === "right" && <polygon points="10,0 0,5 10,10" />}
      </svg>
    </div>
  )
}

// ── Trigger wrapper (wraps the element that should show a tooltip) ──

interface TooltipTriggerProps {
  children: React.ReactNode
  content: React.ReactNode
  side?: "top" | "bottom" | "left" | "right"
  delayMs?: number
}

export function TooltipTrigger({
  children,
  content,
  side = "top",
  delayMs = 0,
}: TooltipTriggerProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const show = () => {
    timerRef.current = setTimeout(() => {
      if (!ref.current) return
      const rect = ref.current.getBoundingClientRect()
      tooltipStore.set({
        open: true,
        content,
        x: rect.left + rect.width / 2,
        y: rect.top,
        side,
      })
    }, delayMs)
  }

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current)
    tooltipStore.set({ open: false })
  }

  return (
    <div
      ref={ref}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
      className="inline-flex"
      data-slot="tooltip-trigger"
    >
      {children}
    </div>
  )
}
