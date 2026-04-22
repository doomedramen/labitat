import { memo } from "react";
import Image from "next/image";
import { resolveIconUrl } from "@/lib/icons";
import { cn } from "@/lib/utils";

interface ItemIconProps {
  iconUrl: string | null;
  label: string;
  serviceIcon?: string | null;
  onError?: () => void;
  size?: "sm" | "md" | "lg";
}

const KNOWN_CDNS = ["cdn.jsdelivr.net"];

const SIZE_MAP = {
  sm: { container: "h-7 w-7", image: 28 },
  md: { container: "h-9 w-9", image: 36 },
  lg: { container: "h-11 w-11", image: 44 },
};

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
  size = "md",
}: ItemIconProps) {
  // Use custom iconUrl if provided, otherwise fall back to service icon
  const rawIcon = iconUrl || serviceIcon || null;
  const resolvedUrl = resolveIconUrl(rawIcon);
  const iconSrc = resolvedUrl ? toProxyUrl(resolvedUrl) : null;
  const sizeConfig = SIZE_MAP[size];

  // No icon available — show fallback with gradient
  if (!iconSrc) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-lg",
          "bg-gradient-to-br from-muted/80 to-muted/40",
          "border border-border/30",
          sizeConfig.container,
        )}
      >
        <span
          className={cn(
            "text-sm font-bold leading-none",
            "bg-gradient-to-br from-foreground/70 to-foreground/40",
            "bg-clip-text text-transparent",
          )}
        >
          {label.charAt(0).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center",
        "rounded-lg bg-gradient-to-br from-card to-muted/50",
        "p-1.5",
        sizeConfig.container,
      )}
    >
      <Image
        src={iconSrc}
        alt={label}
        width={sizeConfig.image}
        height={sizeConfig.image}
        className="h-full w-full object-contain drop-shadow-sm"
        loading="eager"
        decoding="async"
        onError={onError}
      />
    </div>
  );
});
