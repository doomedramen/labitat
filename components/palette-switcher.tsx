"use client"

import * as React from "react"
import { updatePalette } from "@/actions/settings"
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
  const [palette, setPalette] = React.useState<string>("")

  React.useEffect(() => {
    const stored = localStorage.getItem("labitat-palette")
    const current =
      stored ||
      document.documentElement.getAttribute("data-palette") ||
      "default"
    setPalette(current)
  }, [])

  async function handleChange(value: string) {
    setPalette(value)
    localStorage.setItem("labitat-palette", value)
    document.documentElement.setAttribute("data-palette", value)
    await updatePalette(value)
    onSelect?.()
  }

  if (!palette) return null

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
