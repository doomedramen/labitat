import { memo } from "react";
import Image from "next/image";
import { resolveIconUrl } from "@/lib/icons";

interface ItemIconProps {
  iconUrl: string | null;
  label: string;
  serviceIcon?: string | null;
  onError?: () => void;
}

const KNOWN_CDNS = ["cdn.jsdelivr.net"];

function toProxyUrl(src: string): string | null {
  if (!src || src.trim() === "") return null;
  if (!src.startsWith("http://") && !src.startsWith("https://")) return src;
  try {
    const url = new URL(src);
    if (KNOWN_CDNS.includes(url.hostname)) {
      return src;
    }
  } catch {
    // Invalid URL, fall through to proxy
  }
  return `/api/icon?url=${encodeURIComponent(src)}`;
}

export const ItemIcon = memo(function ItemIcon({
  iconUrl,
  label,
  serviceIcon,
  onError,
}: ItemIconProps) {
  // Use custom iconUrl if provided, otherwise fall back to service icon
  const rawIcon = iconUrl || serviceIcon || null;
  const resolvedUrl = resolveIconUrl(rawIcon);
  const iconSrc = resolvedUrl ? toProxyUrl(resolvedUrl) : null;

  // No icon available — show fallback
  if (!iconSrc) {
    return (
      <div className="flex h-8 w-8 shrink-0 items-center justify-center">
        <span className="text-xs font-medium text-muted-foreground">
          {label.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-8 w-8 shrink-0 items-center justify-center">
      <Image
        src={iconSrc}
        alt={label}
        width={32}
        height={32}
        className="h-8 w-8 object-contain"
        loading="eager"
        decoding="async"
        onError={onError}
      />
    </div>
  );
});
