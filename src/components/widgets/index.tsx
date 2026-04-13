/**
 * Shared widget components for service adapters.
 * Barrel file that re-exports server-compatible and client components.
 *
 * Server-compatible (no "use client" in their own files):
 *   - ListItem, ActiveStreamList/Item, DownloadList/Item
 *   - ResourceBar, ResourceBarDual
 *   - StatCard (delegates to StatCardSortable when sortable+editMode)
 *
 * Client-only (use dnd-kit hooks):
 *   - StatGrid, StatCardSortable
 *
 * Note: This barrel file itself is server-compatible. Import client components
 * directly when needed in client components.
 */

// ── Server-compatible list widgets ────────────────────────────────────────────

export { ActiveStreamList, ActiveStreamItem, formatDuration } from "./active-stream";
export type { ActiveStream } from "./active-stream";

export { DownloadList, DownloadItem } from "./download";
export type { DownloadItemData } from "./download";

export { ListItem } from "./list-item";
export type { ListItemProps, ListItemTrailingItem } from "./list-item";

// ── Server-compatible resource bars ───────────────────────────────────────────

export { ResourceBar, ResourceBarDual } from "./resource-bar";
export type { ResourceBarProps, ResourceBarDualProps } from "./resource-bar";

// ── Stat cards (StatCard is server-compatible; StatGrid is client-only) ────────

export { StatCard, StatCardSortable, StatGrid } from "./stat-card";
export type { StatItem, StatCardProps } from "./stat-card";

// ── Widget container ──────────────────────────────────────────────────────────

export { WidgetContainer } from "./widget-container";
