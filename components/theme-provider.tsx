"use client"

import * as React from "react"
import {
  ThemeProvider as NextThemesProvider,
  useTheme as useNextTheme,
} from "next-themes"

const COOKIE_NAME = "labitat-theme"

function setThemeCookie(value: string) {
  try {
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=31536000; SameSite=Lax`
  } catch {
    // cookies may be unavailable
  }
}

export function ThemeProvider({
  children,
  serverTheme,
  ...props
}: React.ComponentProps<typeof NextThemesProvider> & { serverTheme?: string }) {
  return (
    <NextThemesProvider {...props} defaultTheme={serverTheme ?? "system"}>
      <ThemeCookieSync />
      {children}
    </NextThemesProvider>
  )
}

/**
 * Syncs the theme cookie whenever the theme changes.
 * next-themes handles its own persistence and restoration via localStorage.
 */
function ThemeCookieSync() {
  const { theme } = useNextTheme()

  React.useEffect(() => {
    if (theme) {
      setThemeCookie(theme)
    }
  }, [theme])

  return null
}

/**
 * Hook that wraps next-themes' useTheme to also sync to a cookie.
 * Use this instead of useTheme directly wherever you call setTheme.
 */
export function useThemeCookie() {
  const { theme, setTheme, resolvedTheme, themes, ...rest } = useNextTheme()

  const setThemeWithCookie = React.useCallback(
    (value: string) => {
      setTheme(value)
      setThemeCookie(value)
    },
    [setTheme]
  )

  return { theme, setTheme: setThemeWithCookie, resolvedTheme, themes, ...rest }
}
