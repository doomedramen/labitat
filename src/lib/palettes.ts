export const PALETTES = [
  { id: "default", label: "Default" },
  { id: "nord", label: "Nord" },
  { id: "catppuccin", label: "Catppuccin" },
  { id: "gruvbox", label: "Gruvbox" },
  { id: "dracula", label: "Dracula" },
  { id: "one-dark", label: "One Dark" },
  { id: "solarized", label: "Solarized" },
  { id: "tokyo-night", label: "Tokyo Night" },
  { id: "monokai", label: "Monokai" },
  { id: "dawn", label: "Dawn" },
  { id: "mist-green", label: "Mist Green" },
  { id: "vintage-paper", label: "Vintage Paper" },
  { id: "sakura-blossom-neon", label: "Sakura Blossom Neon" },
];

function sortPalettes(palettes: typeof PALETTES) {
  return [...palettes].sort((a, b) => {
    if (a.id === "default") return -1;
    if (b.id === "default") return 1;
    return a.label.localeCompare(b.label);
  });
}

export const SORTED_PALETTES = sortPalettes(PALETTES);
export const VALID_PALETTE_IDS = SORTED_PALETTES.map((p) => p.id);
