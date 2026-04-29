/**
 * Types for stat card data.
 * Server-compatible (no React hooks).
 */

export type StatItem = {
  /** Stable identifier for DnD and React keys */
  id: string;
  value: string | number;
  label: string;
  /** Icon component — rendered with className="h-3 w-3" automatically */
  icon?: React.ComponentType<{ className?: string }>;
  /** When set, the label text is hidden and shown only in a tooltip */
  tooltip?: React.ReactNode;
  valueClassName?: string;
};
