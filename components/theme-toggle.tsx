"use client"

import { Moon, Sun, Monitor } from "lucide-react"
import { useTheme } from "next-themes"
import { usePalette } from "@/hooks/use-palette"
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"

export function ThemeToggle({ onSelect }: { onSelect?: () => void }) {
  const { theme, setTheme } = useTheme()
  const { palette } = usePalette()

  // AMOLED is dark-only, hide the theme toggle
  if (palette === "amoled") return null

  return (
    <DropdownMenuRadioGroup
      value={theme}
      onValueChange={(value) => {
        setTheme(value)
        onSelect?.()
      }}
    >
      <DropdownMenuRadioItem value="light">
        <Sun className="mr-2 h-4 w-4" />
        Light
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="dark">
        <Moon className="mr-2 h-4 w-4" />
        Dark
      </DropdownMenuRadioItem>
      <DropdownMenuRadioItem value="system">
        <Monitor className="mr-2 h-4 w-4" />
        System
      </DropdownMenuRadioItem>
    </DropdownMenuRadioGroup>
  )
}
