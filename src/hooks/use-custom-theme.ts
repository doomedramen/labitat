"use client";

import * as React from "react";
import {
  DEFAULT_CUSTOM_THEME,
  THEME_KEYS,
  type CustomThemeColors,
  type ThemeKey,
} from "@/lib/theme-semantic";

const COOKIE_NAME = "labitat-custom-theme";

function getInitialTheme(): CustomThemeColors {
  if (typeof window === "undefined") {
    return DEFAULT_CUSTOM_THEME;
  }
  try {
    const cookie = document.cookie.split("; ").find((row) => row.startsWith(`${COOKIE_NAME}=`));
    if (cookie) {
      const decoded = decodeURIComponent(cookie.split("=")[1]);
      return JSON.parse(decoded) as CustomThemeColors;
    }
  } catch {
    // ignore parse errors
  }
  return DEFAULT_CUSTOM_THEME;
}

function setThemeCookie(theme: CustomThemeColors) {
  try {
    const encoded = encodeURIComponent(JSON.stringify(theme));
    document.cookie = `${COOKIE_NAME}=${encoded}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // cookies may be unavailable
  }
}

function cssVarName(key: ThemeKey, mode: "light" | "dark"): string {
  const suffix = mode === "dark" ? "-dark" : "";
  return `--custom-${key}${suffix}`;
}

export function useCustomTheme() {
  const [theme, setThemeState] = React.useState<CustomThemeColors>(getInitialTheme);

  React.useEffect(() => {
    setThemeCookie(theme);
    applyThemeToDocument(theme);
  }, [theme]);

  const setColor = React.useCallback((key: ThemeKey, color: string, mode: "light" | "dark") => {
    setThemeState((prev) => ({
      ...prev,
      [mode]: {
        ...prev[mode],
        [key]: color,
      },
    }));
  }, []);

  const getColor = React.useCallback(
    (key: ThemeKey, mode: "light" | "dark"): string => {
      return theme[mode][key];
    },
    [theme],
  );

  const resetToDefaults = React.useCallback(() => {
    setThemeState(DEFAULT_CUSTOM_THEME);
  }, []);

  return {
    theme,
    setColor,
    getColor,
    resetToDefaults,
    setTheme: setThemeState,
  };
}

function applyThemeToDocument(theme: CustomThemeColors) {
  if (typeof document === "undefined") return;

  const root = document.documentElement;
  const mode = document.documentElement.classList.contains("dark") ? "dark" : "light";

  THEME_KEYS.forEach((key) => {
    const cssVar = `${cssVarName(key, mode)}`;
    root.style.setProperty(cssVar, theme[mode][key]);
  });
}
