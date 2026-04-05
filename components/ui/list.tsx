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
  progress,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  /** Progress percentage (0-100) for bottom progress bar */
  progress?: number
}) {
  return (
    <div className="relative">
      <div
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground",
          className
        )}
        {...props}
      >
        {children}
      </div>
      {progress !== undefined && progress > 0 && (
        <div
          className="absolute bottom-0 left-0 h-[2px] rounded-b-md bg-primary"
          style={{
            width: `${Math.min(100, Math.max(0, progress))}%`,
          }}
        />
      )}
    </div>
  )
}
