"use client"

/**
 * Wraps interactive elements inside an <a> tag so they can respond to
 * pointer events (hover, tap → tooltip) without triggering navigation.
 */

import { cn } from "@/lib/utils"

export function BlockLinkPropagation({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn("w-full", className)}
      onClick={(e) => e.preventDefault()}
    >
      {children}
    </div>
  )
}
