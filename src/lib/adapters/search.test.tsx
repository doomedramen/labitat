import { describe, it, expect } from "vitest";
import { searchDefinition } from "@/lib/adapters/search";

describe("search definition", () => {
  it("has correct metadata", () => {
    expect(searchDefinition.id).toBe("search");
    expect(searchDefinition.name).toBe("Search");
    expect(searchDefinition.icon).toBe("search");
    expect(searchDefinition.category).toBe("info");
  });

  it("has configFields defined", () => {
    expect(searchDefinition.configFields).toBeDefined();
    expect(searchDefinition.configFields).toHaveLength(1);
    expect(searchDefinition.configFields[0].key).toBe("engines");
    expect(searchDefinition.configFields[0].type).toBe("text");
    expect(searchDefinition.configFields[0].required).toBe(false);
  });

  describe("fetchData", () => {
    it("returns default engines when not provided", async () => {
      const result = await searchDefinition.fetchData!({});

      expect(result._status).toBe("ok");
      expect(result.engines).toBe("Google,DuckDuckGo,Bing");
    });

    it("uses provided engines", async () => {
      const result = await searchDefinition.fetchData!({
        engines: "SearXNG,Startpage",
      });

      expect(result._status).toBe("ok");
      expect(result.engines).toBe("SearXNG,Startpage");
    });
  });

  describe("renderWidget", () => {
    it("is defined", () => {
      expect(searchDefinition.renderWidget).toBeDefined();
      expect(typeof searchDefinition.renderWidget).toBe("function");
    });
  });
});
