/**
 * Types for download components.
 * Server-compatible (no React hooks).
 */

export type DownloadItemData = {
  title: string;
  subtitle?: string;
  progress: number;
  timeLeft?: string;
  activity?: string;
  size?: string;
};
