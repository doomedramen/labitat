"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import { resolveIconUrl } from "@/lib/icons"

interface ItemIconProps {
  iconUrl: string | null
  label: string
  serviceIcon?: string | null // Service definition icon (fallback)
}

export function ItemIcon({ iconUrl, label, serviceIcon }: ItemIconProps) {
  // Use custom iconUrl if provided, otherwise fall back to service icon
  const rawIcon = iconUrl || serviceIcon || null
  const iconSrc = resolveIconUrl(rawIcon)

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md",
        "bg-secondary"
      )}
    >
      {iconSrc ? (
        <Image
          src={iconSrc}
          alt={label}
          width={20}
          height={20}
          className="h-5 w-5 object-contain"
          loading="lazy"
          unoptimized={iconSrc.startsWith("http")}
          onError={(e) => {
            // Fallback to first letter
            const target = e.target as HTMLImageElement
            target.style.display = "none"
            const parent = target.parentElement
            if (parent) {
              parent.textContent = label.charAt(0).toUpperCase()
              parent.classList.add(
                "text-xs",
                "font-medium",
                "text-muted-foreground"
              )
            }
          }}
        />
      ) : (
        <span className="text-xs font-medium text-muted-foreground">
          {label.charAt(0).toUpperCase()}
        </span>
      )}
    </div>
  )
}
