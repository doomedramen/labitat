"use client"

import * as React from "react"

const STORAGE_KEY = "labitat-palette"
const DEFAULT_PALETTE = "default"

function getInitialPalette(): string {
  if (typeof window === "undefined") {
    // SSR: try to read from document attribute if available
    return (
      document?.documentElement?.getAttribute("data-palette") ?? DEFAULT_PALETTE
    )
  }
  try {
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_PALETTE
  } catch {
    return DEFAULT_PALETTE
  }
}

export function usePalette() {
  const [palette, setPalette] = React.useState<string>(getInitialPalette)

  React.useEffect(() => {
    // Sync palette to localStorage and document attribute
    document.documentElement.setAttribute("data-palette", palette)
    try {
      localStorage.setItem(STORAGE_KEY, palette)
    } catch {
      // localStorage may be unavailable (e.g., private browsing)
    }
  }, [palette])

  const updatePalette = React.useCallback(async (value: string) => {
    setPalette(value)
    // Import dynamically to avoid server-component issues
    const { updatePalette: serverUpdate } = await import("@/actions/settings")
    await serverUpdate(value)
  }, [])

  return { palette, setPalette: updatePalette }
}
