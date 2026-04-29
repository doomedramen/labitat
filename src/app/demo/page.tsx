"use client";

import { useState, useEffect } from "react";
import { StatusDot } from "@/components/dashboard/item/status-dot";
import type { ServiceStatus } from "@/lib/adapters/types";

const STATUSES = [
  { label: "Healthy", status: { state: "healthy" } satisfies ServiceStatus },
  { label: "Reachable", status: { state: "reachable" } satisfies ServiceStatus },
  {
    label: "Degraded",
    status: { state: "degraded", reason: "Queue depth is elevated" } satisfies ServiceStatus,
  },
  {
    label: "Slow response",
    status: {
      state: "slow",
      reason: "Responding with latency",
      timeoutMs: 2000,
    } satisfies ServiceStatus,
  },
  {
    label: "Error",
    status: { state: "error", reason: "Connection refused" } satisfies ServiceStatus,
  },
  { label: "Cached", status: { state: "unknown" } satisfies ServiceStatus, cached: true },
];

export default function DemoPage() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let animationFrameId: number;

    const animate = () => {
      setProgress((prev) => {
        if (prev >= 1) {
          // Reset to 0 and start over
          return 0;
        }
        // Increment by ~0.0167 per frame (60fps * 10s = 600 frames, so ~0.00167 per frame)
        // But let's make it faster for demo: ~3 seconds per loop
        // 3s * 60fps = 180 frames, so ~0.00556 per frame
        return Math.min(prev + 0.0056, 1);
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    animationFrameId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--color-bg-root)",
        color: "var(--color-text-primary)",
        padding: "40px 20px",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: 800,
          margin: "0 auto",
        }}
      >
        <h1
          style={{
            fontSize: 32,
            fontWeight: 700,
            marginBottom: 8,
          }}
        >
          Status Dot Demo
        </h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            marginBottom: 40,
            fontSize: 14,
          }}
        >
          Real-time animated sync rings using the simpler dot treatment.
        </p>

        {/* Progress indicator */}
        <div
          style={{
            marginBottom: 32,
            padding: 16,
            background: "var(--color-bg-surface)",
            borderRadius: 12,
            border: "1px solid var(--color-border-default)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 8,
              fontSize: 12,
              color: "var(--color-text-secondary)",
            }}
          >
            <span>Progress: {(progress * 100).toFixed(1)}%</span>
            <span>{progress.toFixed(3)}</span>
          </div>
          <div
            style={{
              height: 8,
              background: "var(--color-bg-elevated)",
              borderRadius: 4,
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${progress * 100}%`,
                background: "var(--color-accent-primary)",
                borderRadius: 4,
                transition: "width 0.1s linear",
              }}
            />
          </div>
        </div>

        {/* Status Dots */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {STATUSES.map(({ label, status, cached }) => (
            <div
              key={label}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                padding: "16px 20px",
                background: "var(--color-bg-surface)",
                borderRadius: 12,
                border: "1px solid var(--color-border-default)",
              }}
            >
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 4,
                  }}
                >
                  {label}{" "}
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                      fontWeight: 400,
                    }}
                  >
                    ({status.state})
                  </span>
                </div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--color-text-muted)",
                  }}
                >
                  Progress: {(progress * 100).toFixed(1)}%
                </div>
              </div>
              <StatusDot
                itemId={`demo-${label.toLowerCase().replace(/\s+/g, "-")}`}
                status={status}
                cached={cached}
                pollingMs={3000}
                progress={progress * 100}
              />
            </div>
          ))}
        </div>

        {/* Info section */}
        <div
          style={{
            marginTop: 32,
            padding: 16,
            background: "var(--color-bg-surface)",
            borderRadius: 12,
            border: "1px solid var(--color-border-default)",
            fontSize: 12,
            color: "var(--color-text-secondary)",
            lineHeight: 1.6,
          }}
        >
          <p style={{ marginBottom: 8, fontWeight: 600, color: "var(--color-text-primary)" }}>
            How it works:
          </p>
          <ul style={{ paddingLeft: 20, margin: 0 }}>
            <li>The sync ring depletes continuously as the next refresh approaches</li>
            <li>The center dot carries the semantic status color</li>
            <li>Problem states expose details through the hover card</li>
            <li>The `Cached` example uses the muted unknown treatment</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
