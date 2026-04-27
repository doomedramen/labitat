"use client";

import { useState, useEffect, useRef } from "react";
import { StatusPill } from "@/components/dashboard/item/status-pill";

const STATUSES = [
  { status: "online" as const, text: "Online" },
  { status: "warning" as const, text: "Degraded" },
  { status: "error" as const, text: "Error" },
  { status: "stale" as const, text: "Cached" },
  { status: "info" as const, text: "Info" },
];

export default function DemoPage() {
  const [progress, setProgress] = useState(0);
  const ref = useRef<number>(0);

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
          Status Pill Demo
        </h1>
        <p
          style={{
            color: "var(--color-text-secondary)",
            marginBottom: 40,
            fontSize: 14,
          }}
        >
          Real-time animated progress (0 → 1, looping). All pills share the same progress value.
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

        {/* Status Pills */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          {STATUSES.map(({ status, text }) => (
            <div
              key={status}
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
                  {text}{" "}
                  <span
                    style={{
                      fontSize: 12,
                      color: "var(--color-text-muted)",
                      fontWeight: 400,
                    }}
                  >
                    ({status})
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
              <StatusPill status={status} text={text} progress={progress} />
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
            <li>The progress stroke animates from 0% to 100% in a continuous loop</li>
            <li>
              Background uses semantic color at 15% opacity via <code>color-mix()</code>
            </li>
            <li>Track stroke uses the same background as the pill (almost invisible)</li>
            <li>Progress stroke uses full semantic color</li>
            <li>Status dot pulses for non-stale states</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
