"use client"

import * as React from "react"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { updatePalette } from "@/actions/settings"

const PALETTES = [
  { id: "default", label: "Default" },
  { id: "nord", label: "Nord" },
  { id: "catppuccin", label: "Catppuccin" },
  { id: "gruvbox", label: "Gruvbox" },
  { id: "amoled", label: "AMOLED" },
]

export function PaletteSwitcher() {
  const [palette, setPalette] = React.useState<string>("")

  React.useEffect(() => {
    // Try localStorage first for instant load, fall back to DOM attribute
    const stored = localStorage.getItem("labitat-palette")
    const current =
      stored ||
      document.documentElement.getAttribute("data-palette") ||
      "default"
    setPalette(current)
  }, [])

  async function handleChange(value: string | null) {
    if (!value) return
    setPalette(value)
    localStorage.setItem("labitat-palette", value)
    document.documentElement.setAttribute("data-palette", value)
    await updatePalette(value)
  }

  if (!palette) return null

  return (
    <Select value={palette} onValueChange={handleChange}>
      <SelectTrigger
        className="h-8 w-[120px] text-xs"
        data-testid="palette-switcher"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="z-[100]">
        {PALETTES.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
