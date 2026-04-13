"use client";

import * as React from "react";

const COOKIE_NAME = "labitat-background";
const SCALE_COOKIE = "labitat-bg-scale";
const OPACITY_COOKIE = "labitat-bg-opacity";
const DEFAULT_BACKGROUND = "none";
const DEFAULT_SCALE = "1";
const DEFAULT_OPACITY = "1";

function getCookieValue(name: string, fallback: string): string {
  if (typeof window === "undefined") {
    return fallback;
  }
  try {
    return (
      document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${name}=`))
        ?.split("=")[1] ?? fallback
    );
  } catch {
    return fallback;
  }
}

function setCookie(name: string, value: string) {
  try {
    document.cookie = `${name}=${value}; path=/; max-age=31536000; SameSite=Lax`;
  } catch {
    // cookies may be unavailable
  }
}

function debounce(fn: () => void, ms: number) {
  let timer: ReturnType<typeof setTimeout>;
  return () => {
    clearTimeout(timer);
    timer = setTimeout(fn, ms);
  };
}

export function useBackground() {
  const [background, setBackgroundState] = React.useState<string>(() =>
    getCookieValue(COOKIE_NAME, DEFAULT_BACKGROUND),
  );
  const [scale, setScaleState] = React.useState<string>(() =>
    getCookieValue(SCALE_COOKIE, DEFAULT_SCALE),
  );
  const [opacity, setOpacityState] = React.useState<string>(() =>
    getCookieValue(OPACITY_COOKIE, DEFAULT_OPACITY),
  );

  // Persist background immediately (rarely changes)
  React.useEffect(() => {
    setCookie(COOKIE_NAME, background);
    document.documentElement.setAttribute("data-background", background);
  }, [background]);

  // Debounced scale persistence
  const persistScale = React.useRef(
    debounce(() => {
      setCookie(SCALE_COOKIE, scale);
    }, 500),
  ).current;

  React.useEffect(() => {
    document.documentElement.style.setProperty("--bg-scale", scale);
    persistScale();
  }, [scale, persistScale]);

  // Debounced opacity persistence
  const persistOpacity = React.useRef(
    debounce(() => {
      setCookie(OPACITY_COOKIE, opacity);
    }, 500),
  ).current;

  React.useEffect(() => {
    document.documentElement.style.setProperty("--bg-opacity", opacity);
    persistOpacity();
  }, [opacity, persistOpacity]);

  // Persist on blur as a safety net
  React.useEffect(() => {
    const handleBlur = () => {
      setCookie(SCALE_COOKIE, scale);
      setCookie(OPACITY_COOKIE, opacity);
    };
    window.addEventListener("blur", handleBlur);
    return () => window.removeEventListener("blur", handleBlur);
  }, [scale, opacity]);

  const setBackground = React.useCallback((value: string) => {
    setBackgroundState(value);
  }, []);

  const setScale = React.useCallback((value: string) => {
    setScaleState(value);
  }, []);

  const setOpacity = React.useCallback((value: string) => {
    setOpacityState(value);
  }, []);

  return {
    background,
    setBackground,
    scale,
    setScale,
    opacity,
    setOpacity,
  };
}
