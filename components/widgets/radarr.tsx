import type { ServiceData } from "@/lib/adapters/types"

type RadarrData = ServiceData & {
  queued?: number
  errors?: number
  warnings?: number
}

type RadarrWidgetProps = RadarrData & {
  children?: React.ReactNode
  className?: string
}

export function RadarrWidget({
  queued,
  errors,
  warnings,
  children,
  className,
}: RadarrWidgetProps) {
  const items: { value: number; label: string }[] = []

  if (queued !== undefined) {
    items.push({ value: queued, label: "queued" })
  }

  if (errors !== undefined && errors > 0) {
    items.push({ value: errors, label: "errors" })
  }

  if (warnings !== undefined && warnings > 0) {
    items.push({ value: warnings, label: "warnings" })
  }

  if (items.length === 0 && !children) return null

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-3 gap-y-1 text-xs",
        className
      )}
    >
      {items.map((item) => (
        <div key={item.label} className="flex flex-col">
          <span className="font-medium text-foreground tabular-nums">
            {item.value}
          </span>
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
      {children}
    </div>
  )
}

import { cn } from "@/lib/utils"
