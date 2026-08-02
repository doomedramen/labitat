import { describe, expect, it } from "vitest";
import { parseIconCatalog } from "@/lib/icon-catalog";

describe("parseIconCatalog", () => {
  it("extracts selfh.st icon names and slugs and removes duplicate slugs", () => {
    expect(
      parseIconCatalog([
        ["Plex", "plex", "Y"],
        ["Plex duplicate", "plex", "Y"],
        ["Home Assistant", "home-assistant", "Y"],
      ]),
    ).toEqual([
      { name: "Plex", slug: "plex" },
      { name: "Home Assistant", slug: "home-assistant" },
    ]);
  });

  it("ignores malformed catalog entries", () => {
    expect(parseIconCatalog([null, [], ["Missing slug"], [42, "number-name"]])).toEqual([]);
    expect(parseIconCatalog({ icons: [] })).toEqual([]);
  });
});
