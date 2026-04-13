import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format TanStack Form / Zod error objects into a readable string */
export function formatErrors(errors: unknown[]): string {
  const messages = errors.map((e) =>
    typeof e === "string" ? e : ((e as { message?: string }).message ?? String(e)),
  );
  return [...new Set(messages)].join(", ");
}

/**
 * Resolve an icon slug to a full selfh.st CDN URL.
 * If the icon is already a full URL (http:// or https://), return as-is.
 * If the icon is a slug (e.g. "overseerr", "plex"), convert to CDN URL.
 * Supports various extensions and defaults to PNG.
 */
export function resolveIconUrl(icon: string | null | undefined): string {
  if (!icon) return "";

  // Already a full URL
  if (icon.startsWith("http://") || icon.startsWith("https://")) {
    return icon;
  }

  // Remove file extension if present
  const slug = icon.replace(/\.(png|svg|webp)$/i, "");

  // Return PNG format from selfh.st CDN
  return `https://cdn.jsdelivr.net/gh/selfhst/icons@main/png/${slug}.png`;
}
