/**
 * Server-compatible widget exports.
 * Re-exports all SSR-safe components from the folder structure.
 */

// List components (server-compatible)
export { ActiveStreamList, ActiveStreamItem, formatDuration } from "./active-stream";
export type { ActiveStream } from "./active-stream";

export { DownloadList, DownloadItem } from "./download";
export type { DownloadItemData } from "./download";

export { ListItem } from "./list-item";
export type { ListItemProps, ListItemTrailingItem } from "./list-item";

// Resource bars (server-compatible)
export { ResourceBar, ResourceBarDual } from "./resource-bar";
export type { ResourceBarProps, ResourceBarDualProps } from "./resource-bar";

// Stat cards (StatCard is server-compatible; StatGrid/StatCardSortable are client-only)
export { StatCard } from "./stat-card";
export { StatCardSortable, StatGrid } from "./stat-card";
export type { StatItem, StatCardProps } from "./stat-card";
