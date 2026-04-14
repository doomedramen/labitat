import { describe, it, expect } from "vitest";
import { normalizeUrl, isValidUrl, urlSchema, requiredUrlSchema } from "./url-utils";

describe("normalizeUrl", () => {
  it("returns null for empty string", () => {
    expect(normalizeUrl("")).toBeNull();
  });

  it("returns null for whitespace-only string", () => {
    expect(normalizeUrl("   ")).toBeNull();
  });

  it("trims whitespace from input", () => {
    expect(normalizeUrl("  example.com  ")).toBe("http://example.com");
  });

  it("prepends http:// to URLs without protocol", () => {
    expect(normalizeUrl("example.com")).toBe("http://example.com");
    expect(normalizeUrl("localhost:3000")).toBe("http://localhost:3000");
  });

  it("preserves http:// protocol", () => {
    expect(normalizeUrl("http://example.com")).toBe("http://example.com");
  });

  it("preserves https:// protocol", () => {
    expect(normalizeUrl("https://example.com")).toBe("https://example.com");
  });

  it("handles URLs with paths", () => {
    expect(normalizeUrl("example.com/path")).toBe("http://example.com/path");
    expect(normalizeUrl("https://example.com/path")).toBe("https://example.com/path");
  });
});

describe("isValidUrl", () => {
  it("returns false for empty string", () => {
    expect(isValidUrl("")).toBe(false);
  });

  it("returns false for whitespace-only string", () => {
    expect(isValidUrl("   ")).toBe(false);
  });

  it("returns true for valid URLs with protocol", () => {
    expect(isValidUrl("http://example.com")).toBe(true);
    expect(isValidUrl("https://example.com")).toBe(true);
  });

  it("returns true for valid URLs without protocol", () => {
    expect(isValidUrl("example.com")).toBe(true);
    expect(isValidUrl("localhost:3000")).toBe(true);
  });

  it("returns true for URLs with paths and query strings", () => {
    expect(isValidUrl("https://example.com/path?query=value")).toBe(true);
  });

  it("returns false for invalid URLs", () => {
    expect(isValidUrl("not a url")).toBe(false);
  });
});

describe("urlSchema", () => {
  it("accepts empty strings", () => {
    const result = urlSchema.safeParse("");
    expect(result.success).toBe(true);
  });

  it("accepts whitespace-only strings", () => {
    const result = urlSchema.safeParse("   ");
    expect(result.success).toBe(true);
  });

  it("accepts valid URLs with protocol", () => {
    const result = urlSchema.safeParse("https://example.com");
    expect(result.success).toBe(true);
  });

  it("accepts valid URLs without protocol", () => {
    const result = urlSchema.safeParse("example.com");
    expect(result.success).toBe(true);
  });

  it("rejects invalid URLs", () => {
    const result = urlSchema.safeParse("not a url");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Must be a valid URL");
    }
  });
});

describe("requiredUrlSchema", () => {
  it("rejects empty strings", () => {
    const result = requiredUrlSchema.safeParse("");
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.message).toContain("Must be a valid URL");
    }
  });

  it("rejects whitespace-only strings", () => {
    const result = requiredUrlSchema.safeParse("   ");
    expect(result.success).toBe(false);
  });

  it("accepts valid URLs with protocol", () => {
    const result = requiredUrlSchema.safeParse("https://example.com");
    expect(result.success).toBe(true);
  });

  it("accepts valid URLs without protocol", () => {
    const result = requiredUrlSchema.safeParse("example.com");
    expect(result.success).toBe(true);
  });

  it("rejects invalid URLs", () => {
    const result = requiredUrlSchema.safeParse("not a url");
    expect(result.success).toBe(false);
  });
});
