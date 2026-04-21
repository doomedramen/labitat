import { describe, it, expect } from "vitest";
import { PALETTES, SORTED_PALETTES, VALID_PALETTE_IDS } from "./palettes";

describe("palettes", () => {
  it("exports PALETTES array", () => {
    expect(Array.isArray(PALETTES)).toBe(true);
    expect(PALETTES.length).toBeGreaterThan(0);
  });

  it("each palette has required properties", () => {
    for (const palette of PALETTES) {
      expect(palette).toHaveProperty("id");
      expect(palette).toHaveProperty("label");
      expect(typeof palette.id).toBe("string");
      expect(typeof palette.label).toBe("string");
    }
  });

  it("includes 'nord' palette", () => {
    const nordPalette = PALETTES.find((p) => p.id === "nord");
    expect(nordPalette).toBeDefined();
    expect(nordPalette?.label).toBe("Nord");
  });

  it("has unique IDs", () => {
    const ids = PALETTES.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});

describe("SORTED_PALETTES", () => {
  it("is sorted alphabetically by label", () => {
    const labels = SORTED_PALETTES.map((p) => p.label);
    expect(labels).toEqual([...labels].sort());
  });

  it("contains same number of items as PALETTES", () => {
    expect(SORTED_PALETTES.length).toBe(PALETTES.length);
  });
});

describe("VALID_PALETTE_IDS", () => {
  it("is an array of strings", () => {
    expect(Array.isArray(VALID_PALETTE_IDS)).toBe(true);
    expect(VALID_PALETTE_IDS.every((id) => typeof id === "string")).toBe(true);
  });

  it("contains all palette IDs", () => {
    const paletteIds = PALETTES.map((p) => p.id);
    expect(VALID_PALETTE_IDS.sort()).toEqual(paletteIds.sort());
  });
});
