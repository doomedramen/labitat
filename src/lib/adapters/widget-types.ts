import type { ReactNode } from "react"
import type { DownloadItem, ActiveStream, StatItem } from "@/components/widgets"

/**
 * Standardized widget payload that adapters return.
 * Instead of rendering JSX directly, adapters provide data
 * and WidgetContainer handles the layout.
 */
export type WidgetPayload = {
  /** Stats to display in the stat grid */
  stats: StatItem[]
  /** Active download/import list (Sonarr, Radarr, Transmission, etc.) */
  downloads?: DownloadItem[]
  /** Active stream list (Plex, Tautulli, Jellyfin, etc.) */
  streams?: ActiveStream[]
  /** Custom component rendered below stats (for adapters that need custom UI like ResourceBars, charts, etc.) */
  customComponent?: ReactNode
  /** Error state - when set, shows error UI instead of content */
  error?: string | null
  /** Loading state - when true, shows skeleton loader */
  loading?: boolean
}

// Re-export for convenience
export type { StatItem }
