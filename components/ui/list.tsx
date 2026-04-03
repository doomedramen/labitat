import { cn } from "@/lib/utils"
import React from "react"

/**
 * Generic list container component for consistent styling across the app.
 * Used for displaying lists of items in widgets (streams, downloads, etc.)
 */
export function List({
  className,
  children,
  bordered = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  /** Whether to show a top border separating from widget stats */
  bordered?: boolean
}) {
  return (
    <div
      className={cn(
        "mt-2 flex flex-col gap-1.5 text-xs",
        bordered && "border-t pt-2",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

/**
 * Generic list item component for consistent styling.
 */
export function ListItem({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
