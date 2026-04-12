"use client"

import { Check } from "lucide-react"
import { cn } from "@/lib/utils"
import { SORTED_BACKGROUNDS } from "@/lib/backgrounds"
import { useBackground } from "@/hooks/use-background"
import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

interface BackgroundSwitcherProps {
  onSelect?: () => void
}

export function BackgroundSwitcher({ onSelect }: BackgroundSwitcherProps) {
  const { background, setBackground } = useBackground()

  function handleChange(id: string) {
    setBackground(id)
    onSelect?.()
  }

  return (
    <div className="flex flex-col gap-1.5 p-1">
      {SORTED_BACKGROUNDS.map((bg) => (
        <DropdownMenuItem
          key={bg.id}
          className={cn(
            "flex flex-col gap-2 rounded-md p-2",
            background === bg.id && "bg-accent"
          )}
          onSelect={(e) => {
            e.preventDefault()
            handleChange(bg.id)
          }}
        >
          {/* Preview swatch: 256x90 */}
          <div
            className="h-[90px] w-[256px] shrink-0 overflow-hidden rounded-md border border-border/50"
            style={{
              background: bg.preview,
            }}
          />
          {/* Label with checkmark */}
          <div className="flex w-full items-center justify-between">
            <span className="text-sm">{bg.label}</span>
            {background === bg.id && <Check className="h-4 w-4 text-primary" />}
          </div>
        </DropdownMenuItem>
      ))}
    </div>
  )
}
