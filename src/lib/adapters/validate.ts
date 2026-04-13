/**
 * Lightweight response validation utility for adapter API responses.
 *
 * Every adapter calls `.json()` on HTTP responses and accesses fields without
 * validation. This module wraps those calls so malformed responses produce
 * clear, actionable errors instead of silent wrong data or cryptic
 * "cannot read property of undefined" failures.
 */

// ── Types ────────────────────────────────────────────────────────────────────

/** A single validation rule for a nested field path (dot-separated). */
export type FieldSpec = {
  /** Dot-separated path, e.g. "records" or "queue.slots" */
  path: string;
  /** Optional stricter type check beyond "property exists" */
  type?: "array" | "object" | "number" | "string" | "boolean";
};

/** Options accepted by `validateResponse`. */
export type ValidateOptions = {
  /** Adapter id, included in error messages for quick identification. */
  adapter: string;
  /**
   * Endpoints that may legitimately return an empty / fallback shape
   * (e.g. Prowlarr stats when the service is unreachable). When the value
   * is `null`, `undefined`, or `{}`, validation is skipped and an empty
   * object is returned instead.
   */
  optional?: boolean;
};

// ── Helpers ──────────────────────────────────────────────────────────────────

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/**
 * Walk `obj` along a dot-separated `path` and return the leaf value.
 * Returns `undefined` if any segment is missing.
 */
function dig(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current == null || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function typeLabel(v: unknown): string {
  if (Array.isArray(v)) return "array";
  if (v === null) return "null";
  return typeof v;
}

function checkType(value: unknown, expected: FieldSpec["type"]): boolean {
  switch (expected) {
    case "array":
      return Array.isArray(value);
    case "object":
      return isPlainObject(value);
    case "number":
      return typeof value === "number";
    case "string":
      return typeof value === "string";
    case "boolean":
      return typeof value === "boolean";
    default:
      return true;
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Validate a parsed JSON value against required top-level and optional nested
 * field specifications.
 *
 * @param value   The raw value returned by `await res.json()`.
 * @param fields  Required top-level field names on the response object.
 * @param nested  Optional array of `FieldSpec` objects for nested paths.
 * @param options Adapter name and optional flags.
 *
 * @returns The validated value, typed as `T`.
 * @throws  Error with a descriptive message on validation failure.
 *
 * @example
 * ```ts
 * const stats = validateResponse(
 *   await statsRes.json(),
 *   ["num_dns_queries", "num_blocked_filtering"],
 *   [],
 *   { adapter: "adguard" },
 * )
 * ```
 */
export function validateResponse<T = Record<string, unknown>>(
  value: unknown,
  fields: string[],
  nested: FieldSpec[] = [],
  options: ValidateOptions,
): T {
  const { adapter, optional = false } = options;

  // ── Null / undefined handling ────────────────────────────────────────────
  if (value == null) {
    if (optional) return {} as T;
    throw new Error(`[${adapter}] API returned null/undefined instead of a JSON object`);
  }

  // ── Must be a plain object ───────────────────────────────────────────────
  if (!isPlainObject(value)) {
    if (optional) return {} as T;
    throw new Error(`[${adapter}] API returned ${typeLabel(value)} instead of a JSON object`);
  }

  const obj = value as Record<string, unknown>;

  // ── Allow optional empty objects ─────────────────────────────────────────
  if (optional && Object.keys(obj).length === 0) {
    return {} as T;
  }

  // ── Top-level field checks ───────────────────────────────────────────────
  const missing: string[] = [];
  for (const field of fields) {
    if (!(field in obj)) {
      missing.push(field);
    }
  }
  if (missing.length > 0) {
    throw new Error(`[${adapter}] API response missing required field(s): ${missing.join(", ")}`);
  }

  // ── Nested field checks ──────────────────────────────────────────────────
  for (const spec of nested) {
    const fieldValue = dig(obj, spec.path);
    if (fieldValue === undefined) {
      // nested fields are optional — only error when type is specified
      if (spec.type) {
        throw new Error(`[${adapter}] API response missing nested field "${spec.path}"`);
      }
      continue;
    }
    if (spec.type && !checkType(fieldValue, spec.type)) {
      throw new Error(
        `[${adapter}] API response field "${spec.path}" expected ${spec.type} but got ${typeLabel(fieldValue)}`,
      );
    }
  }

  return obj as T;
}

/**
 * Validate that a parsed JSON value is an array.
 * Use this for endpoints that return top-level arrays (e.g. Radarr /movie,
 * Prowlarr /indexer, qBittorrent /torrents/info).
 *
 * @param value   The raw value returned by `await res.json()`.
 * @param options Adapter name and optional flags.
 *
 * @returns The validated array, typed as `T[]`.
 * @throws  Error with a descriptive message if the value is not an array.
 */
export function validateArrayResponse<T = unknown>(value: unknown, options: ValidateOptions): T[] {
  const { adapter, optional = false } = options;

  if (value == null) {
    if (optional) return [];
    throw new Error(`[${adapter}] API returned null/undefined instead of a JSON array`);
  }

  if (Array.isArray(value)) return value as T[];

  if (optional) return [];

  throw new Error(`[${adapter}] API returned ${typeLabel(value)} instead of a JSON array`);
}

/**
 * Parse a string config value as a boolean.
 * @param value   The raw config string (e.g. "true", "false", or undefined)
 * @param default_ The default value when the config is missing or empty
 */
export function parseBool(value: string | undefined, default_: boolean = false): boolean {
  if (value === undefined || value === "") return default_;
  return value === "true";
}
