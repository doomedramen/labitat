import { describe, it, expect } from "vitest";
import { validateResponse, validateArrayResponse, parseBool } from "./validate";

describe("validateResponse", () => {
  it("throws error for null value when not optional", () => {
    expect(() => validateResponse(null, [], [], { adapter: "test" })).toThrow(
      "[test] API returned null/undefined instead of a JSON object",
    );
  });

  it("throws error for undefined value when not optional", () => {
    expect(() => validateResponse(undefined, [], [], { adapter: "test" })).toThrow(
      "[test] API returned null/undefined instead of a JSON object",
    );
  });

  it("returns empty object for null value when optional", () => {
    const result = validateResponse(null, [], [], { adapter: "test", optional: true });
    expect(result).toEqual({});
  });

  it("returns empty object for undefined value when optional", () => {
    const result = validateResponse(undefined, [], [], { adapter: "test", optional: true });
    expect(result).toEqual({});
  });

  it("throws error for non-object value when not optional", () => {
    expect(() => validateResponse("string", [], [], { adapter: "test" })).toThrow(
      "[test] API returned string instead of a JSON object",
    );
  });

  it("throws error for array value when not optional", () => {
    expect(() => validateResponse([], [], [], { adapter: "test" })).toThrow(
      "[test] API returned array instead of a JSON object",
    );
  });

  it("returns empty object for array value when optional", () => {
    const result = validateResponse([], [], [], { adapter: "test", optional: true });
    expect(result).toEqual({});
  });

  it("allows empty objects when optional", () => {
    const result = validateResponse({}, [], [], { adapter: "test", optional: true });
    expect(result).toEqual({});
  });

  it("validates required top-level fields", () => {
    expect(() => validateResponse({ foo: "bar" }, ["foo", "baz"], [], { adapter: "test" })).toThrow(
      "[test] API response missing required field(s): baz",
    );
  });

  it("passes when all required fields are present", () => {
    const result = validateResponse({ foo: "bar", baz: 123 }, ["foo", "baz"], [], {
      adapter: "test",
    });
    expect(result).toEqual({ foo: "bar", baz: 123 });
  });

  it("validates nested field paths", () => {
    expect(() =>
      validateResponse(
        { data: { nested: { value: 123 } } },
        ["data"],
        [{ path: "data.nested.missing", type: "number" }],
        { adapter: "test" },
      ),
    ).toThrow('[test] API response missing nested field "data.nested.missing"');
  });

  it("allows missing nested fields without type specification", () => {
    const result = validateResponse(
      { data: { nested: { value: 123 } } },
      ["data"],
      [{ path: "data.nested.missing" }],
      { adapter: "test" },
    );
    expect(result).toEqual({ data: { nested: { value: 123 } } });
  });

  it("validates nested field types", () => {
    expect(() =>
      validateResponse({ items: "not an array" }, [], [{ path: "items", type: "array" }], {
        adapter: "test",
      }),
    ).toThrow('[test] API response field "items" expected array but got string');
  });

  it("validates array type", () => {
    const result = validateResponse({ items: [1, 2, 3] }, [], [{ path: "items", type: "array" }], {
      adapter: "test",
    });
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  it("validates object type", () => {
    const result = validateResponse(
      { data: { key: "value" } },
      [],
      [{ path: "data", type: "object" }],
      { adapter: "test" },
    );
    expect(result).toEqual({ data: { key: "value" } });
  });

  it("validates number type", () => {
    const result = validateResponse({ count: 42 }, [], [{ path: "count", type: "number" }], {
      adapter: "test",
    });
    expect(result).toEqual({ count: 42 });
  });

  it("validates string type", () => {
    const result = validateResponse({ name: "test" }, [], [{ path: "name", type: "string" }], {
      adapter: "test",
    });
    expect(result).toEqual({ name: "test" });
  });

  it("validates boolean type", () => {
    const result = validateResponse({ enabled: true }, [], [{ path: "enabled", type: "boolean" }], {
      adapter: "test",
    });
    expect(result).toEqual({ enabled: true });
  });

  it("handles multiple missing fields in error message", () => {
    expect(() =>
      validateResponse({}, ["field1", "field2", "field3"], [], { adapter: "test" }),
    ).toThrow("[test] API response missing required field(s): field1, field2, field3");
  });
});

describe("validateArrayResponse", () => {
  it("throws error for null value when not optional", () => {
    expect(() => validateArrayResponse(null, { adapter: "test" })).toThrow(
      "[test] API returned null/undefined instead of a JSON array",
    );
  });

  it("throws error for undefined value when not optional", () => {
    expect(() => validateArrayResponse(undefined, { adapter: "test" })).toThrow(
      "[test] API returned null/undefined instead of a JSON array",
    );
  });

  it("returns empty array for null value when optional", () => {
    const result = validateArrayResponse(null, { adapter: "test", optional: true });
    expect(result).toEqual([]);
  });

  it("throws error for non-array value when not optional", () => {
    expect(() => validateArrayResponse({ key: "value" }, { adapter: "test" })).toThrow(
      "[test] API returned object instead of a JSON array",
    );
  });

  it("returns empty array for non-array value when optional", () => {
    const result = validateArrayResponse({ key: "value" }, { adapter: "test", optional: true });
    expect(result).toEqual([]);
  });

  it("returns valid arrays", () => {
    const result = validateArrayResponse([1, 2, 3], { adapter: "test" });
    expect(result).toEqual([1, 2, 3]);
  });

  it("returns empty arrays", () => {
    const result = validateArrayResponse([], { adapter: "test" });
    expect(result).toEqual([]);
  });
});

describe("parseBool", () => {
  it("returns default (false) for undefined", () => {
    expect(parseBool(undefined)).toBe(false);
  });

  it("returns default (false) for empty string", () => {
    expect(parseBool("")).toBe(false);
  });

  it("returns custom default for undefined", () => {
    expect(parseBool(undefined, true)).toBe(true);
  });

  it("returns custom default for empty string", () => {
    expect(parseBool("", true)).toBe(true);
  });

  it("returns true for 'true' string", () => {
    expect(parseBool("true")).toBe(true);
  });

  it("returns false for 'false' string", () => {
    expect(parseBool("false")).toBe(false);
  });

  it("returns false for other strings", () => {
    expect(parseBool("yes")).toBe(false);
    expect(parseBool("1")).toBe(false);
  });
});
