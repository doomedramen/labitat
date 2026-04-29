/**
 * Types for resource bar components.
 * Server-compatible (no React hooks).
 */

export type ResourceBarProps = {
  label: string;
  value: number; // 0–100 percentage
  hint?: string; // shown alongside value (e.g. "12.4 GB")
  warningAt?: number;
  criticalAt?: number;
};
