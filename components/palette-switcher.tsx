"use client"

import { usePalette } from "@/hooks/use-palette"
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"

const PALETTES = [
  { id: "default", label: "Default" },
  { id: "nord", label: "Nord" },
  { id: "catppuccin", label: "Catppuccin" },
  { id: "gruvbox", label: "Gruvbox" },
  { id: "amoled", label: "AMOLED" },
  { id: "dracula", label: "Dracula" },
  { id: "one-dark", label: "One Dark" },
  { id: "solarized", label: "Solarized" },
  { id: "tokyo-night", label: "Tokyo Night" },
  { id: "monokai", label: "Monokai" },
  { id: "dawn", label: "Dawn" },
]

export function PaletteSwitcher({ onSelect }: { onSelect?: () => void }) {
  const { palette, setPalette } = usePalette()

  async function handleChange(value: string) {
    await setPalette(value)
    onSelect?.()
  }

  return (
    <DropdownMenuRadioGroup value={palette} onValueChange={handleChange}>
      {PALETTES.map((p) => (
        <DropdownMenuRadioItem key={p.id} value={p.id}>
          {p.label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}
