/**
 * Server-compatible wrappers for ActiveStreamList and DownloadList.
 * Uses dynamic imports to embed client components for SSR compatibility.
 */

import dynamic from "next/dynamic";
import type { ActiveStream, DownloadItem } from "@/components/widgets";

// Dynamically import client components for SSR compatibility
const ActiveStreamListClient = dynamic(
  () => import("@/components/widgets").then((mod) => ({ default: mod.ActiveStreamList })),
  { ssr: false },
);

const DownloadListClient = dynamic(
  () => import("@/components/widgets").then((mod) => ({ default: mod.DownloadList })),
  { ssr: false },
);

interface ActiveStreamListProps {
  streams: ActiveStream[];
}

interface DownloadListProps {
  downloads: DownloadItem[];
}

export function ActiveStreamList({ streams }: ActiveStreamListProps) {
  if (!streams.length) return null;
  return <ActiveStreamListClient streams={streams} />;
}

export function DownloadList({ downloads }: DownloadListProps) {
  if (!downloads.length) return null;
  return <DownloadListClient downloads={downloads} />;
}
