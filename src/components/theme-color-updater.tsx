"use client"

import * as React from "react"
import { useThemeCookie } from "@/components/theme-provider"

/** Updates the PWA theme-color meta tag when the theme changes */
export function ThemeColorUpdater() {
  const { resolvedTheme } = useThemeCookie()

  React.useEffect(() => {
    const meta = document.querySelector('meta[name="theme-color"]')
    if (meta) {
      meta.setAttribute(
        "content",
        resolvedTheme === "dark" ? "#1d2035" : "#f2f4fa"
      )
    } else {
      const newMeta = document.createElement("meta")
      newMeta.name = "theme-color"
      newMeta.content = resolvedTheme === "dark" ? "#1d2035" : "#f2f4fa"
      document.head.appendChild(newMeta)
    }
  }, [resolvedTheme])

  return null
}
