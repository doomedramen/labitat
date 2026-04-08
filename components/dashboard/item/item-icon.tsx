"use client"

import { useState } from "react"
import Image from "next/image"
import { GlobeIcon } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Icon URL builder ──────────────────────────────────────────────────────────

function buildIconUrl(effectiveUrl: string): string {
  if (effectiveUrl.startsWith("http")) return effectiveUrl

  const slug = effectiveUrl.toLowerCase()

  if (slug.endsWith(".png")) {
    return `https://cdn.jsdelivr.net/gh/selfhst/icons@main/png/${slug.replace(".png", "")}.png`
  }
  if (slug.endsWith(".webp")) {
    return `https://cdn.jsdelivr.net/gh/selfhst/icons@main/webp/${slug.replace(".webp", "")}.webp`
  }
  if (slug.endsWith(".svg")) {
    return `https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/${slug.replace(".svg", "")}.svg`
  }

  return `https://cdn.jsdelivr.net/gh/selfhst/icons@main/png/${slug}.png`
}

// ── ItemIcon component ────────────────────────────────────────────────────────

interface ItemIconProps {
  iconUrl: string | null
  label: string
  href?: string | null
}

export function ItemIcon({ iconUrl, label, href }: ItemIconProps) {
  const [status, setStatus] = useState<"loading" | "loaded" | "error">(
    "loading"
  )

  // Explicitly disabled
  if (iconUrl === "none") return null

  // Auto-detect favicon from href when no custom icon is set
  const faviconUrl =
    !iconUrl && href
      ? (() => {
          try {
            return new URL(href).origin + "/favicon.ico"
          } catch {
            return null
          }
        })()
      : null

  const effectiveUrl = iconUrl || faviconUrl

  // Show globe icon if nothing to show or image failed to load
  if (!effectiveUrl || status === "error") {
    return (
      <div className="flex size-9 flex-none items-center justify-center bg-muted">
        <GlobeIcon className="size-4 text-muted-foreground" />
      </div>
    )
  }

  const src = buildIconUrl(effectiveUrl)

  return (
    // Image is invisible while loading to prevent the browser's broken-image
    // icon from flashing on error (e.g. favicon.ico 404). Cached images load
    // in ~1 frame so the transparent state is imperceptible.
    <Image
      src={src}
      alt={label}
      width={36}
      height={36}
      unoptimized
      className={cn(
        "size-9 flex-none object-contain",
        status !== "loaded" && "invisible"
      )}
      onLoad={() => setStatus("loaded")}
      onError={() => setStatus("error")}
    />
  )
}
