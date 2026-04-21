export const PALETTES = [
  // Dark themes
  { id: "dracula", label: "Dracula" },
  { id: "catppuccin_frappe", label: "Catppuccin Frappé" },
  { id: "nord", label: "Nord" },
  { id: "tokyo_night", label: "Tokyo Night" },
  { id: "one_dark_pro", label: "One Dark Pro" },
  { id: "synthwave84", label: "Synthwave '84" },
  { id: "gruvbox", label: "Gruvbox" },
  { id: "rose_pine", label: "Rosé Pine" },
  { id: "everforest", label: "Everforest" },
  { id: "kanagawa", label: "Kanagawa" },
  // Light themes
  { id: "catppuccin_latte", label: "Catppuccin Latte" },
  { id: "nord_light", label: "Nord Light" },
  { id: "solarized_light", label: "Solarized Light" },
  { id: "rose_pine_dawn", label: "Rosé Pine Dawn" },
  { id: "gruvbox_light", label: "Gruvbox Light" },
];

function sortPalettes(palettes: typeof PALETTES) {
  return [...palettes].sort((a, b) => a.label.localeCompare(b.label));
}

export const SORTED_PALETTES = sortPalettes(PALETTES);
export const VALID_PALETTE_IDS = SORTED_PALETTES.map((p) => p.id);
