"use client"

import * as React from "react"
import { usePalette } from "@/hooks/use-palette"
import { useThemeCookie } from "@/components/theme-provider"

/**
 * Client component that updates the theme-color meta tag
 * when the palette or theme changes.
 *
 * Reads the actual CSS --background variable from the DOM,
 * so it automatically stays in sync when new palettes are added.
 */
export function ThemeColorUpdater() {
  const { palette } = usePalette()
  const { resolvedTheme } = useThemeCookie()

  React.useEffect(() => {
    // Read the actual CSS variable value from the DOM
    // This automatically stays in sync with any palette/theme CSS
    const bgColor = getComputedStyle(document.documentElement)
      .getPropertyValue("--background")
      .trim()

    if (!bgColor) return

    // Convert oklch to a format browsers understand for meta tags
    // Most modern browsers support oklch in meta theme-color
    const color = bgColor

    // Update the theme-color meta tag
    let meta = document.querySelector(
      'meta[name="theme-color"]'
    ) as HTMLMetaElement

    if (!meta) {
      meta = document.createElement("meta")
      meta.name = "theme-color"
      document.head.appendChild(meta)
    }

    meta.content = color
  }, [palette, resolvedTheme])

  return null
}
