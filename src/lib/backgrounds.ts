export interface BackgroundDefinition {
  id: string;
  label: string;
  /** CSS class applied to the container */
  className: string;
}

export const BACKGROUNDS: BackgroundDefinition[] = [
  {
    id: "none",
    label: "None",
    className: "",
  },
  {
    id: "gradient",
    label: "Gradient",
    className: "bg-gradient",
  },
  {
    id: "boxes",
    label: "Boxes",
    className: "bg-boxes",
  },
  {
    id: "circles",
    label: "Circles",
    className: "bg-circles",
  },
  {
    id: "cross",
    label: "Cross",
    className: "bg-cross",
  },
  {
    id: "crosses",
    label: "Crosses",
    className: "bg-crosses",
  },
  {
    id: "diagonal-2",
    label: "Diagonal 2",
    className: "bg-diagonal-2",
  },
  {
    id: "diagonal-3",
    label: "Diagonal 3",
    className: "bg-diagonal-3",
  },
  {
    id: "lines",
    label: "Lines",
    className: "bg-lines",
  },
  {
    id: "lines-2",
    label: "Lines 2",
    className: "bg-lines-2",
  },
  {
    id: "lines-3",
    label: "Lines 3",
    className: "bg-lines-3",
  },
  {
    id: "lines-4",
    label: "Lines 4",
    className: "bg-lines-4",
  },
  {
    id: "paper",
    label: "Paper",
    className: "bg-paper",
  },
  {
    id: "polka",
    label: "Polka",
    className: "bg-polka",
  },
  {
    id: "polka-2",
    label: "Polka 2",
    className: "bg-polka-2",
  },
  {
    id: "rhombus",
    label: "Rhombus",
    className: "bg-rhombus",
  },
  {
    id: "wavy",
    label: "Wavy",
    className: "bg-wavy",
  },
  {
    id: "zigzag",
    label: "Zigzag",
    className: "bg-zigzag",
  },
  {
    id: "zigzag-3d",
    label: "Zigzag 3D",
    className: "bg-zigzag-3d",
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
