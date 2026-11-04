export const PALETTES = [
  { id: "dark", label: "Dark" },
  { id: "light", label: "Light" },
];
export const SORTED_PALETTES = PALETTES;
export const VALID_PALETTE_IDS = PALETTES.map((palette) => palette.id);

const LEGACY_LIGHT = new Set([
  "catppuccin_latte",
  "nord_light",
  "solarized_light",
  "rose_pine_dawn",
  "gruvbox_light",
]);
/** Preserve the light/dark intent of existing cookies while retiring palette variants. */
export function normalizePalette(value: string | undefined): "light" | "dark" {
  return value === "light" || (value !== undefined && LEGACY_LIGHT.has(value)) ? "light" : "dark";
}
