import { describe, it, expect } from "vitest";
import { BACKGROUNDS, SORTED_BACKGROUNDS, VALID_BACKGROUND_IDS } from "./backgrounds";

describe("backgrounds", () => {
  it("exports BACKGROUNDS array", () => {
    expect(Array.isArray(BACKGROUNDS)).toBe(true);
    expect(BACKGROUNDS.length).toBeGreaterThan(0);
  });

  it("each background has required properties", () => {
    for (const bg of BACKGROUNDS) {
      expect(bg).toHaveProperty("id");
      expect(bg).toHaveProperty("label");
      expect(bg).toHaveProperty("className");
      expect(typeof bg.id).toBe("string");
      expect(typeof bg.label).toBe("string");
      expect(typeof bg.className).toBe("string");
    }
  });

  it("includes 'none' background", () => {
    const noneBg = BACKGROUNDS.find((bg) => bg.id === "none");
    expect(noneBg).toBeDefined();
    expect(noneBg?.className).toBe("");
  });
});

describe("SORTED_BACKGROUNDS", () => {
  it("contains same number of items as BACKGROUNDS", () => {
    expect(SORTED_BACKGROUNDS.length).toBe(BACKGROUNDS.length);
  });

  it("contains all background IDs", () => {
    const bgIds = BACKGROUNDS.map((bg) => bg.id);
    const sortedIds = SORTED_BACKGROUNDS.map((bg) => bg.id);
    expect(sortedIds.sort()).toEqual(bgIds.sort());
  });
});

describe("VALID_BACKGROUND_IDS", () => {
  it("is an array of strings", () => {
    expect(Array.isArray(VALID_BACKGROUND_IDS)).toBe(true);
    expect(VALID_BACKGROUND_IDS.every((id) => typeof id === "string")).toBe(true);
  });

  it("contains all background IDs", () => {
    const bgIds = BACKGROUNDS.map((bg) => bg.id);
    expect(VALID_BACKGROUND_IDS.sort()).toEqual(bgIds.sort());
  });
});
