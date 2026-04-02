"use client"

import * as React from "react"
import { useTheme } from "next-themes"
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

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [palette, setPalette] = React.useState<string>("default")

  React.useEffect(() => {
    setMounted(true)
    const current = document.documentElement.getAttribute("data-palette")
    if (current) setPalette(current)
  }, [])

  async function handlePaletteChange(value: string | null) {
    if (!value) return
    setPalette(value)
    document.documentElement.setAttribute("data-palette", value)
    // AMOLED forces dark mode
    if (value === "amoled") setTheme("dark")
    await updatePalette(value)
  }

  const placeholder = (
    <div className="flex gap-2">
      <div className="flex h-8 w-[130px] items-center justify-between rounded-lg border border-input bg-transparent px-2 py-1 text-sm text-muted-foreground">
        <span>Palette</span>
      </div>
      <div className="flex h-8 w-[100px] items-center justify-between rounded-lg border border-input bg-transparent px-2 py-1 text-sm text-muted-foreground">
        <span>Mode</span>
      </div>
    </div>
  )

  if (!mounted) return placeholder

  return (
    <div className="flex gap-2">
      <Select value={palette} onValueChange={handlePaletteChange}>
        <SelectTrigger className="w-[130px]" data-testid="palette-switcher">
          <SelectValue placeholder="Palette" />
        </SelectTrigger>
        <SelectContent>
          {PALETTES.map((p) => (
            <SelectItem key={p.id} value={p.id} data-testid={`palette-${p.id}`}>
              {p.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {palette !== "amoled" && (
        <Select value={theme} onValueChange={(v) => v && setTheme(v)}>
          <SelectTrigger className="w-[100px]" data-testid="theme-switcher">
            <SelectValue placeholder="Mode" />
          </SelectTrigger>
          <SelectContent data-testid="theme-switcher-content">
            <SelectItem value="light" data-testid="theme-light">
              Light
            </SelectItem>
            <SelectItem value="dark" data-testid="theme-dark">
              Dark
            </SelectItem>
            <SelectItem value="system" data-testid="theme-system">
              System
            </SelectItem>
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
