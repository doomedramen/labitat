/**
 * Types for stat card components.
 * Server-compatible (no React hooks).
 */

import type { StatDisplayMode } from "@/lib/types";

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

export interface StatCardProps extends StatItem {
  displayMode?: StatDisplayMode;
  sortable?: boolean;
  editMode?: boolean;
}
