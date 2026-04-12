"use client"

import * as React from "react"

const COOKIE_NAME = "labitat-background"
const DEFAULT_BACKGROUND = "none"

function getInitialBackground(): string {
  if (typeof window === "undefined") {
    return DEFAULT_BACKGROUND
  }
  try {
    return (
      document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${COOKIE_NAME}=`))
        ?.split("=")[1] ?? DEFAULT_BACKGROUND
    )
  } catch {
    return DEFAULT_BACKGROUND
  }
}

function setBackgroundCookie(value: string) {
  try {
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=31536000; SameSite=Lax`
  } catch {
    // cookies may be unavailable
  }
}

export function useBackground() {
  const [background, setBackgroundState] =
    React.useState<string>(getInitialBackground)

  React.useEffect(() => {
    setBackgroundCookie(background)
    document.documentElement.setAttribute("data-background", background)
  }, [background])

  const updateBackground = React.useCallback((value: string) => {
    setBackgroundState(value)
  }, [])

  return { background, setBackground: updateBackground }
}
