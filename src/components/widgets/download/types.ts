/**
 * Types for download components.
 * Server-compatible (no React hooks).
 */

export type DownloadItemData = {
  title: string;
  progress: number;
  timeLeft?: string;
  activity?: string;
  size?: string;
};
