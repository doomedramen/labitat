"use client"

import { SORTED_PALETTES } from "@/lib/palettes"
import { usePalette } from "@/hooks/use-palette"
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
} from "@/components/ui/dropdown-menu"

export function PaletteSwitcher({ onSelect }: { onSelect?: () => void }) {
  const { palette, setPalette } = usePalette()

  async function handleChange(value: string) {
    await setPalette(value)
    onSelect?.()
  }

  return (
    <DropdownMenuRadioGroup value={palette} onValueChange={handleChange}>
      {SORTED_PALETTES.map((p) => (
        <DropdownMenuRadioItem key={p.id} value={p.id}>
          {p.label}
        </DropdownMenuRadioItem>
      ))}
    </DropdownMenuRadioGroup>
  )
}
