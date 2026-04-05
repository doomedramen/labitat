export const PALETTES = [
  { id: "default", label: "Default" },
  { id: "nord", label: "Nord" },
  { id: "catppuccin", label: "Catppuccin" },
  { id: "gruvbox", label: "Gruvbox" },
  { id: "amoled", label: "AMOLED" },
  { id: "dracula", label: "Dracula" },
  { id: "one-dark", label: "One Dark" },
  { id: "solarized", label: "Solarized" },
  { id: "tokyo-night", label: "Tokyo Night" },
  { id: "monokai", label: "Monokai" },
  { id: "dawn", label: "Dawn" },
  { id: "mist-green", label: "Mist Green" },
  { id: "vintage-paper", label: "Vintage Paper" },
  { id: "candyland", label: "Candyland" },
  { id: "vercel", label: "Vercel" },
  { id: "cyberpunk", label: "Cyberpunk" },
  { id: "sakura-blossom-neon", label: "Sakura Blossom Neon" },
  { id: "mist-green-9000", label: "Mist Green 9000" },
  { id: "doom-64", label: "DOOM 64" },
]

function sortPalettes(palettes: typeof PALETTES) {
  return [...palettes].sort((a, b) => {
    if (a.id === "default") return -1
    if (b.id === "default") return 1
    return a.label.localeCompare(b.label)
  })
}

export const SORTED_PALETTES = sortPalettes(PALETTES)
export const VALID_PALETTE_IDS = SORTED_PALETTES.map((p) => p.id)
