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

  it("includes 'default' palette", () => {
    const defaultPalette = PALETTES.find((p) => p.id === "default");
    expect(defaultPalette).toBeDefined();
    expect(defaultPalette?.label).toBe("Default");
  });

  it("has unique IDs", () => {
    const ids = PALETTES.map((p) => p.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });
});

describe("SORTED_PALETTES", () => {
  it("is sorted alphabetically by label with 'default' first", () => {
    const labels = SORTED_PALETTES.map((p) => p.label);
    expect(labels[0]).toBe("Default");
    const restLabels = labels.slice(1);
    expect(restLabels).toEqual([...restLabels].sort());
  });

  it("has 'default' as first item", () => {
    expect(SORTED_PALETTES[0].id).toBe("default");
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
