import { describe, it, expect } from "vitest";
import { cn, formatErrors, resolveIconUrl } from "./utils";

describe("cn", () => {
  it("merges class names correctly", () => {
    const result = cn("foo", "bar");
    expect(result).toBe("foo bar");
  });

  it("handles conditional classes", () => {
    const shouldInclude = true;
    const shouldExclude = false;
    const result = cn(
      "base",
      shouldInclude ? "conditional" : undefined,
      shouldExclude ? "hidden" : undefined,
    );
    expect(result).toBe("base conditional");
  });

  it("handles array of classes", () => {
    const result = cn(["foo", "bar"]);
    expect(result).toBe("foo bar");
  });

  it("handles object-based classes", () => {
    const result = cn({ foo: true, bar: false, baz: true });
    expect(result).toBe("foo baz");
  });

  it("merges tailwind classes with conflicts", () => {
    const result = cn("px-2 py-1", "px-4");
    expect(result).toBe("py-1 px-4");
  });
});

describe("formatErrors", () => {
  it("formats string errors", () => {
    const result = formatErrors(["Error 1", "Error 2"]);
    expect(result).toBe("Error 1, Error 2");
  });

  it("formats object errors with message property", () => {
    const result = formatErrors([{ message: "Validation failed" }, { message: "Required field" }]);
    expect(result).toBe("Validation failed, Required field");
  });

  it("handles mixed error types", () => {
    const result = formatErrors(["String error", { message: "Object error" }, 123]);
    expect(result).toBe("String error, Object error, 123");
  });

  it("deduplicates error messages", () => {
    const result = formatErrors(["Duplicate", "Duplicate", "Unique"]);
    expect(result).toBe("Duplicate, Unique");
  });

  it("handles empty array", () => {
    const result = formatErrors([]);
    expect(result).toBe("");
  });

  it("handles objects without message property", () => {
    const result = formatErrors([{ code: "INVALID" }]);
    expect(result).toBe("[object Object]");
  });
});

describe("resolveIconUrl", () => {
  it("returns empty string for null input", () => {
    expect(resolveIconUrl(null)).toBe("");
  });

  it("returns empty string for undefined input", () => {
    expect(resolveIconUrl(undefined)).toBe("");
  });

  it("returns empty string for empty string", () => {
    expect(resolveIconUrl("")).toBe("");
  });

  it("returns http URLs as-is", () => {
    expect(resolveIconUrl("http://example.com/icon.png")).toBe("http://example.com/icon.png");
  });

  it("returns https URLs as-is", () => {
    expect(resolveIconUrl("https://example.com/icon.png")).toBe("https://example.com/icon.png");
  });

  it("converts icon slug to selfh.st CDN URL", () => {
    expect(resolveIconUrl("plex")).toBe(
      "https://cdn.jsdelivr.net/gh/selfhst/icons@main/png/plex.png",
    );
  });

  it("removes .png extension from slug", () => {
    expect(resolveIconUrl("plex.png")).toBe(
      "https://cdn.jsdelivr.net/gh/selfhst/icons@main/png/plex.png",
    );
  });

  it("removes .svg extension from slug", () => {
    expect(resolveIconUrl("plex.svg")).toBe(
      "https://cdn.jsdelivr.net/gh/selfhst/icons@main/png/plex.png",
    );
  });

  it("removes .webp extension from slug", () => {
    expect(resolveIconUrl("plex.webp")).toBe(
      "https://cdn.jsdelivr.net/gh/selfhst/icons@main/png/plex.png",
    );
  });

  it("handles complex icon slugs", () => {
    expect(resolveIconUrl("home-assistant")).toBe(
      "https://cdn.jsdelivr.net/gh/selfhst/icons@main/png/home-assistant.png",
    );
  });
});
