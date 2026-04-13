"use client";

import * as React from "react";

const COOKIE_NAME = "labitat-palette";
const DEFAULT_PALETTE = "default";

function getInitialPalette(): string {
  if (typeof window === "undefined") {
    return DEFAULT_PALETTE;
  }
  try {
    return (
      document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${COOKIE_NAME}=`))
        ?.split("=")[1] ?? DEFAULT_PALETTE
    );
  } catch {
    return DEFAULT_PALETTE;
  }
}

function setPaletteCookie(value: string) {
  try {
    document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // cookies may be unavailable
  }
}

export function usePalette() {
  const [palette, setPaletteState] = React.useState<string>(getInitialPalette);

  React.useEffect(() => {
    setPaletteCookie(palette);
    document.documentElement.setAttribute("data-palette", palette);
  }, [palette]);

  const updatePalette = React.useCallback((value: string) => {
    setPaletteState(value);
  }, []);

  return { palette, setPalette: updatePalette };
}
