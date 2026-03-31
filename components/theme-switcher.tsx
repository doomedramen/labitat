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

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // During SSR and initial client render, render a static placeholder
  // to avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex h-8 w-[140px] items-center justify-between rounded-lg border border-input bg-transparent px-2 py-1 text-sm text-muted-foreground">
        <span>Theme</span>
      </div>
    )
  }

  return (
    <Select value={theme} onValueChange={(value) => value && setTheme(value)}>
      <SelectTrigger className="w-[140px]" data-testid="theme-switcher">
        <SelectValue placeholder="Theme" />
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
  )
}
