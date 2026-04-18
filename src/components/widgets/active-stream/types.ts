/**
 * Types for active stream components.
 * Server-compatible (no React hooks).
 */

export type ActiveStream = {
  title: string;
  /** Series / show name for TV episodes */
  subtitle?: string;
  /** Episode number in S01E05 format */
  episode?: string;
  user: string;
  progress: number;
  duration: number;
  state?: "playing" | "paused";
  /** Stream ID for media control callbacks */
  streamId?: string;
  /** Transcoding information */
  transcoding?: {
    /** True if playing without transcoding (direct play/stream) */
    isDirect?: boolean;
    /** True if hardware decoding is enabled */
    hardwareDecoding?: boolean;
    /** True if hardware encoding is enabled */
    hardwareEncoding?: boolean;
  };
};
