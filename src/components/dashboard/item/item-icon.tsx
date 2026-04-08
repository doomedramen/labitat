"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface ItemIconProps {
  iconUrl: string | null
  label: string
}

export function ItemIcon({ iconUrl, label }: ItemIconProps) {
  const iconSrc = iconUrl || `/icons/fallback.svg`

  return (
    <div
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md",
        "bg-secondary"
      )}
    >
      {iconUrl ? (
        <Image
          src={iconUrl}
          alt={label}
          width={20}
          height={20}
          className="h-5 w-5 object-contain"
          loading="lazy"
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
