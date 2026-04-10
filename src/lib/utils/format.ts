/**
 * Shared formatting utilities for adapters.
 * Eliminates duplicate implementations across adapters.
 */

/**
 * Format bytes to human-readable string (1024-based binary units).
 * e.g., 15728640 → "15.0 MB"
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

/**
 * Format seconds to human-readable duration.
 * e.g., 3661 → "1h 1m"
 * e.g., 120 → "2m"
 */
export function formatDuration(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return "∞"
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

/**
 * Format seconds to relative time ago string.
 * e.g., 120 → "2m ago"
 * e.g., 7200 → "2h 0m ago"
 */
export function formatTimeAgo(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s ago`
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m ago`
}

/**
 * Format minutes to human-readable time left string.
 * Used by Sonarr/Radarr for download ETA.
 * e.g., 90 → "1h 30m"
 * e.g., 30 → "30m"
 */
export function formatTimeLeft(minutes: number): string {
  if (minutes <= 0) return ""
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours}h ${mins}m`
}
