/**
 * Format milliseconds into a compact age string
 * Examples: "2m", "1h", "5h", "1d"
 */
export function formatAge(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d`;
  if (hours > 0) return `${hours}h`;
  if (minutes > 0) return `${minutes}m`;
  return `${seconds}s`;
}

/**
 * Format milliseconds into a human-readable verbose age string
 * Examples: "2 minutes ago", "1 hour ago", "5 hours ago", "1 day ago"
 */
export function formatAgeVerbose(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return days === 1 ? "1 day ago" : `${days} days ago`;
  if (hours > 0) return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
  if (minutes > 0) return minutes === 1 ? "1 minute ago" : `${minutes} minutes ago`;
  if (seconds < 10) return "just now";
  return seconds === 1 ? "1 second ago" : `${seconds} seconds ago`;
}

/**
 * Determine if data should be shown as "stale" based on age
 * Threshold: 5 minutes
 */
export function isStale(ms: number): boolean {
  return ms > 5 * 60 * 1000; // 5 minutes
}

/**
 * Get color coding for age
 * - fresh (< 5 min): no special color
 * - stale (5-30 min): green/yellow transition
 * - old (30-60 min): yellow
 * - very old (> 60 min): orange/red
 */
export function getAgeColor(ageMs: number): "fresh" | "stale" | "old" | "very-old" {
  const minutes = ageMs / 1000 / 60;

  if (minutes < 5) return "fresh";
  if (minutes < 30) return "stale";
  if (minutes < 60) return "old";
  return "very-old";
}
