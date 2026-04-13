export interface BackgroundDefinition {
  id: string;
  label: string;
  /** CSS class applied to the container */
  className: string;
  /** Preview gradient/colors for the 90x90 swatch in light mode */
  previewLight: string;
  /** Preview gradient/colors for the 90x90 swatch in dark mode */
  previewDark: string;
}

export const BACKGROUNDS: BackgroundDefinition[] = [
  {
    id: "none",
    label: "None",
    className: "",
    previewLight: "var(--background)",
    previewDark: "var(--background)",
  },
  {
    id: "boxes",
    label: "Boxes",
    className: "bg-boxes",
    previewLight:
      "linear-gradient(var(--bg-pattern-accent) 1px, transparent 1px), linear-gradient(to right, var(--bg-pattern-accent) 1px, var(--bg-pattern-base) 1px)",
    previewDark:
      "linear-gradient(var(--bg-pattern-accent) 1px, transparent 1px), linear-gradient(to right, var(--bg-pattern-accent) 1px, var(--bg-pattern-base) 1px)",
  },
  {
    id: "circles",
    label: "Circles",
    className: "bg-circles",
    previewLight:
      "radial-gradient(circle at center, var(--bg-pattern-accent) 2px, transparent 2px)",
    previewDark: "radial-gradient(circle at center, var(--bg-pattern-accent) 2px, transparent 2px)",
  },
  {
    id: "crosses",
    label: "Crosses",
    className: "bg-crosses",
    previewLight:
      "linear-gradient(var(--bg-pattern-accent) 2px, transparent 2px), linear-gradient(90deg, var(--bg-pattern-accent) 2px, transparent 2px)",
    previewDark:
      "linear-gradient(var(--bg-pattern-accent) 2px, transparent 2px), linear-gradient(90deg, var(--bg-pattern-accent) 2px, transparent 2px)",
  },
  {
    id: "diagonal-2",
    label: "Diagonal 2",
    className: "bg-diagonal-2",
    previewLight:
      "repeating-linear-gradient(45deg, var(--bg-pattern-accent) 0, var(--bg-pattern-accent) 1px, var(--bg-pattern-base) 0, var(--bg-pattern-base) 50%)",
    previewDark:
      "repeating-linear-gradient(45deg, var(--bg-pattern-accent) 0, var(--bg-pattern-accent) 1px, var(--bg-pattern-base) 0, var(--bg-pattern-base) 50%)",
  },
  {
    id: "diagonal-3",
    label: "Diagonal 3",
    className: "bg-diagonal-3",
    previewLight:
      "linear-gradient(30deg, var(--bg-pattern-accent) 12%, transparent 12.5%, transparent 87%, var(--bg-pattern-accent) 87.5%), linear-gradient(150deg, var(--bg-pattern-accent) 12%, transparent 12.5%, transparent 87%, var(--bg-pattern-accent) 87.5%)",
    previewDark:
      "linear-gradient(30deg, var(--bg-pattern-accent) 12%, transparent 12.5%, transparent 87%, var(--bg-pattern-accent) 87.5%), linear-gradient(150deg, var(--bg-pattern-accent) 12%, transparent 12.5%, transparent 87%, var(--bg-pattern-accent) 87.5%)",
  },
  {
    id: "isometric",
    label: "Isometric",
    className: "bg-isometric",
    previewLight:
      "linear-gradient(135deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(225deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(45deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(315deg, var(--bg-pattern-accent) 25%, var(--bg-pattern-base) 25%)",
    previewDark:
      "linear-gradient(135deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(225deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(45deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(315deg, var(--bg-pattern-accent) 25%, var(--bg-pattern-base) 25%)",
  },
  {
    id: "lines",
    label: "Lines",
    className: "bg-lines",
    previewLight: "linear-gradient(0deg, var(--bg-pattern-base) 50%, var(--bg-pattern-accent) 50%)",
    previewDark: "linear-gradient(0deg, var(--bg-pattern-base) 50%, var(--bg-pattern-accent) 50%)",
  },
  {
    id: "lines-2",
    label: "Lines 2",
    className: "bg-lines-2",
    previewLight:
      "linear-gradient(to right, var(--bg-pattern-accent), var(--bg-pattern-accent) 5px, var(--bg-pattern-base) 5px, var(--bg-pattern-base))",
    previewDark:
      "linear-gradient(to right, var(--bg-pattern-accent), var(--bg-pattern-accent) 5px, var(--bg-pattern-base) 5px, var(--bg-pattern-base))",
  },
  {
    id: "lines-3",
    label: "Lines 3",
    className: "bg-lines-3",
    previewLight:
      "repeating-linear-gradient(0deg, var(--bg-pattern-accent), var(--bg-pattern-accent) 1px, var(--bg-pattern-base) 1px, var(--bg-pattern-base))",
    previewDark:
      "repeating-linear-gradient(0deg, var(--bg-pattern-accent), var(--bg-pattern-accent) 1px, var(--bg-pattern-base) 1px, var(--bg-pattern-base))",
  },
  {
    id: "lines-4",
    label: "Lines 4",
    className: "bg-lines-4",
    previewLight:
      "repeating-linear-gradient(to right, var(--bg-pattern-accent), var(--bg-pattern-accent) 1px, var(--bg-pattern-base) 1px, var(--bg-pattern-base))",
    previewDark:
      "repeating-linear-gradient(to right, var(--bg-pattern-accent), var(--bg-pattern-accent) 1px, var(--bg-pattern-base) 1px, var(--bg-pattern-base))",
  },
  {
    id: "moon",
    label: "Moon",
    className: "bg-moon",
    previewLight:
      "radial-gradient(ellipse farthest-corner at 10px 10px, var(--bg-pattern-accent), var(--bg-pattern-accent) 50%, var(--bg-pattern-base) 50%)",
    previewDark:
      "radial-gradient(ellipse farthest-corner at 10px 10px, var(--bg-pattern-accent), var(--bg-pattern-accent) 50%, var(--bg-pattern-base) 50%)",
  },
  {
    id: "paper",
    label: "Paper",
    className: "bg-paper",
    previewLight:
      "linear-gradient(var(--bg-pattern-accent) 2px, transparent 2px), linear-gradient(90deg, var(--bg-pattern-accent) 2px, transparent 2px)",
    previewDark:
      "linear-gradient(var(--bg-pattern-accent) 2px, transparent 2px), linear-gradient(90deg, var(--bg-pattern-accent) 2px, transparent 2px)",
  },
  {
    id: "polka",
    label: "Polka",
    className: "bg-polka",
    previewLight: "radial-gradient(var(--bg-pattern-accent) 0.5px, var(--bg-pattern-base) 0.5px)",
    previewDark: "radial-gradient(var(--bg-pattern-accent) 0.5px, var(--bg-pattern-base) 0.5px)",
  },
  {
    id: "polka-2",
    label: "Polka 2",
    className: "bg-polka-2",
    previewLight:
      "radial-gradient(var(--bg-pattern-accent) 0.5px, transparent 0.5px), radial-gradient(var(--bg-pattern-accent) 0.5px, var(--bg-pattern-base) 0.5px)",
    previewDark:
      "radial-gradient(var(--bg-pattern-accent) 0.5px, transparent 0.5px), radial-gradient(var(--bg-pattern-accent) 0.5px, var(--bg-pattern-base) 0.5px)",
  },
  {
    id: "rectangles",
    label: "Rectangles",
    className: "bg-rectangles",
    previewLight:
      "repeating-linear-gradient(45deg, var(--bg-pattern-accent) 25%, transparent 25%, transparent 75%, var(--bg-pattern-accent) 75%), repeating-linear-gradient(45deg, var(--bg-pattern-accent) 25%, var(--bg-pattern-base) 25%, var(--bg-pattern-base) 75%, var(--bg-pattern-accent) 75%)",
    previewDark:
      "repeating-linear-gradient(45deg, var(--bg-pattern-accent) 25%, transparent 25%, transparent 75%, var(--bg-pattern-accent) 75%), repeating-linear-gradient(45deg, var(--bg-pattern-accent) 25%, var(--bg-pattern-base) 25%, var(--bg-pattern-base) 75%, var(--bg-pattern-accent) 75%)",
  },
  {
    id: "rhombus",
    label: "Rhombus",
    className: "bg-rhombus",
    previewLight:
      "linear-gradient(135deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(225deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(45deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(315deg, var(--bg-pattern-accent) 25%, var(--bg-pattern-base) 25%)",
    previewDark:
      "linear-gradient(135deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(225deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(45deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(315deg, var(--bg-pattern-accent) 25%, var(--bg-pattern-base) 25%)",
  },
  {
    id: "triangles",
    label: "Triangles",
    className: "bg-triangles",
    previewLight:
      "linear-gradient(45deg, var(--bg-pattern-accent) 50%, var(--bg-pattern-base) 50%)",
    previewDark: "linear-gradient(45deg, var(--bg-pattern-accent) 50%, var(--bg-pattern-base) 50%)",
  },
  {
    id: "triangles-2",
    label: "Triangles 2",
    className: "bg-triangles-2",
    previewLight:
      "linear-gradient(-45deg, var(--bg-pattern-base), var(--bg-pattern-base) 50%, var(--bg-pattern-accent) 50%, var(--bg-pattern-accent))",
    previewDark:
      "linear-gradient(-45deg, var(--bg-pattern-base), var(--bg-pattern-base) 50%, var(--bg-pattern-accent) 50%, var(--bg-pattern-accent))",
  },
  {
    id: "wavy",
    label: "Wavy",
    className: "bg-wavy",
    previewLight:
      "repeating-radial-gradient(circle at 0 0, transparent 0, var(--bg-pattern-base) 10px), repeating-linear-gradient(var(--bg-pattern-accent), var(--bg-pattern-accent))",
    previewDark:
      "repeating-radial-gradient(circle at 0 0, transparent 0, var(--bg-pattern-base) 10px), repeating-linear-gradient(var(--bg-pattern-accent), var(--bg-pattern-accent))",
  },
  {
    id: "zigzag",
    label: "Zigzag",
    className: "bg-zigzag",
    previewLight:
      "linear-gradient(135deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(225deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(45deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(315deg, var(--bg-pattern-accent) 25%, var(--bg-pattern-base) 25%)",
    previewDark:
      "linear-gradient(135deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(225deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(45deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(315deg, var(--bg-pattern-accent) 25%, var(--bg-pattern-base) 25%)",
  },
  {
    id: "zigzag-3d",
    label: "Zigzag 3D",
    className: "bg-zigzag-3d",
    previewLight:
      "linear-gradient(135deg, color-mix(in srgb, var(--bg-pattern-accent) 33%, transparent) 25%, transparent 25%), linear-gradient(225deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(315deg, color-mix(in srgb, var(--bg-pattern-accent) 33%, transparent) 25%, transparent 25%), linear-gradient(45deg, var(--bg-pattern-accent) 25%, var(--bg-pattern-base) 25%)",
    previewDark:
      "linear-gradient(135deg, color-mix(in srgb, var(--bg-pattern-accent) 33%, transparent) 25%, transparent 25%), linear-gradient(225deg, var(--bg-pattern-accent) 25%, transparent 25%), linear-gradient(315deg, color-mix(in srgb, var(--bg-pattern-accent) 33%, transparent) 25%, transparent 25%), linear-gradient(45deg, var(--bg-pattern-accent) 25%, var(--bg-pattern-base) 25%)",
  },
];

function sortBackgrounds(backgrounds: typeof BACKGROUNDS) {
  return [...backgrounds].sort((a, b) => {
    if (a.id === "none") return -1;
    if (b.id === "none") return 1;
    return a.label.localeCompare(b.label);
  });
}

export const SORTED_BACKGROUNDS = sortBackgrounds(BACKGROUNDS);
export const VALID_BACKGROUND_IDS = SORTED_BACKGROUNDS.map((b) => b.id);
