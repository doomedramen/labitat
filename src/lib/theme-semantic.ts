export const THEME_KEYS = [
  "background",
  "border",
  "text",
  "sub-card",
  "graph-1",
  "graph-2",
  "success",
  "danger",
  "error",
] as const;

export type ThemeKey = (typeof THEME_KEYS)[number];

export const DEFAULT_CUSTOM_LIGHT: Record<ThemeKey, string> = {
  background: "#fafafa",
  border: "#e5e5e5",
  text: "#171717",
  "sub-card": "#f5f5f5",
  "graph-1": "#22c55e",
  "graph-2": "#3b82f6",
  success: "#22c55e",
  danger: "#f59e0b",
  error: "#ef4444",
};

export const DEFAULT_CUSTOM_DARK: Record<ThemeKey, string> = {
  background: "#171717",
  border: "#404040",
  text: "#fafafa",
  "sub-card": "#262626",
  "graph-1": "#22c55e",
  "graph-2": "#3b82f6",
  success: "#22c55e",
  danger: "#f59e0b",
  error: "#ef4444",
};

export type CustomThemeColors = {
  light: Record<ThemeKey, string>;
  dark: Record<ThemeKey, string>;
};

export const DEFAULT_CUSTOM_THEME: CustomThemeColors = {
  light: DEFAULT_CUSTOM_LIGHT,
  dark: DEFAULT_CUSTOM_DARK,
};
