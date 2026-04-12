export interface BackgroundDefinition {
  id: string
  label: string
  /** CSS class applied to the container */
  className: string
  /** Preview gradient/colors for the 256x90 swatch */
  preview: string
}

export const BACKGROUNDS: BackgroundDefinition[] = [
  {
    id: "none",
    label: "None",
    className: "",
    preview: "var(--background)",
  },
  {
    id: "subtle-gradient",
    label: "Subtle Gradient",
    className: "bg-subtle-gradient",
    preview:
      "linear-gradient(135deg, oklch(0.96 0.01 240) 0%, oklch(0.92 0.02 180) 100%)",
  },
  {
    id: "diagonal-stripes",
    label: "Diagonal Stripes",
    className: "bg-diagonal-stripes",
    preview:
      "repeating-linear-gradient(45deg, oklch(0.95 0.01 240) 0px, oklch(0.95 0.01 240) 10px, oklch(0.90 0.015 240) 10px, oklch(0.90 0.015 240) 20px)",
  },
  {
    id: "dots",
    label: "Dots",
    className: "bg-dots",
    preview:
      "radial-gradient(circle, oklch(0.70 0.05 240) 1px, transparent 1px) 0 0 / 16px 16px, oklch(0.96 0.005 240)",
  },
  {
    id: "mesh-gradient",
    label: "Mesh Gradient",
    className: "bg-mesh-gradient",
    preview:
      "radial-gradient(at 20% 30%, oklch(0.85 0.08 200) 0px, transparent 50%), radial-gradient(at 80% 70%, oklch(0.85 0.08 320) 0px, transparent 50%), radial-gradient(at 50% 50%, oklch(0.90 0.06 160) 0px, transparent 50%), oklch(0.95 0.005 240)",
  },
  {
    id: "aurora",
    label: "Aurora",
    className: "bg-aurora",
    preview:
      "linear-gradient(120deg, oklch(0.90 0.06 180) 0%, oklch(0.88 0.08 140) 25%, oklch(0.90 0.06 280) 50%, oklch(0.88 0.08 320) 75%, oklch(0.90 0.06 180) 100%)",
  },
  {
    id: "grid",
    label: "Grid",
    className: "bg-grid",
    preview:
      "linear-gradient(oklch(0.85 0.02 240) 1px, transparent 1px) 0 0 / 20px 20px, linear-gradient(90deg, oklch(0.85 0.02 240) 1px, transparent 1px) 0 0 / 20px 20px, oklch(0.97 0.005 240)",
  },
  {
    id: "waves",
    label: "Waves",
    className: "bg-waves",
    preview:
      "repeating-radial-gradient(circle at 50% 100%, oklch(0.92 0.03 220) 0px, oklch(0.92 0.03 220) 10px, oklch(0.96 0.01 220) 10px, oklch(0.96 0.01 220) 20px)",
  },
  {
    id: "noise",
    label: "Noise",
    className: "bg-noise",
    preview: "oklch(0.94 0.01 240)",
  },
  {
    id: "crosshatch",
    label: "Crosshatch",
    className: "bg-crosshatch",
    preview:
      "linear-gradient(45deg, oklch(0.88 0.02 240) 25%, transparent 25%, transparent 75%, oklch(0.88 0.02 240) 75%), linear-gradient(-45deg, oklch(0.88 0.02 240) 25%, transparent 25%, transparent 75%, oklch(0.88 0.02 240) 75%), oklch(0.96 0.005 240)",
  },
]

function sortBackgrounds(backgrounds: typeof BACKGROUNDS) {
  return [...backgrounds].sort((a, b) => {
    if (a.id === "none") return -1
    if (b.id === "none") return 1
    return a.label.localeCompare(b.label)
  })
}

export const SORTED_BACKGROUNDS = sortBackgrounds(BACKGROUNDS)
export const VALID_BACKGROUND_IDS = SORTED_BACKGROUNDS.map((b) => b.id)
