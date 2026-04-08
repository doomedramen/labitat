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

function ThemeCookieSync() {
  const { theme } = useNextTheme()

  React.useEffect(() => {
    if (theme) {
      setThemeCookie(theme)
    }
  }, [theme])

  return null
}

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
