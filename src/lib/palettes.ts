export const PALETTES = [
  { id: "nord", label: "Nord" },
  { id: "catppuccin_frappe", label: "Catppuccin Frappé" },
  { id: "dracula", label: "Dracula" },
  { id: "everforest", label: "Everforest" },
  { id: "gruvbox", label: "Gruvbox" },
  { id: "kanagawa", label: "Kanagawa" },
  { id: "one_dark_pro", label: "One Dark Pro" },
  { id: "rose_pine", label: "Rosé Pine" },
  { id: "synthwave84", label: "Synthwave '84" },
  { id: "tokyo_night", label: "Tokyo Night" },
];

function sortPalettes(palettes: typeof PALETTES) {
  return [...palettes].sort((a, b) => a.label.localeCompare(b.label));
}

export const SORTED_PALETTES = sortPalettes(PALETTES);
export const VALID_PALETTE_IDS = SORTED_PALETTES.map((p) => p.id);
