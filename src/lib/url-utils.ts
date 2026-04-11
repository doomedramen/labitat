import { z } from "zod"

/**
 * Normalizes a URL string by prepending "http://" if no protocol is present.
 * Returns the normalized URL or null if the input is empty.
 */
export function normalizeUrl(input: string): string | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed
  }

  return `http://${trimmed}`
}

/**
 * Validates that a string is a valid URL.
 * Accepts URLs with or without protocol (http:// or https://).
 * If no protocol is specified, it will be validated as-is after prepending http://.
 * Returns true if the URL is valid, false otherwise.
 */
export function isValidUrl(input: string): boolean {
  const normalized = normalizeUrl(input)
  if (!normalized) return false

  try {
    new URL(normalized)
    return true
  } catch {
    return false
  }
}

/**
 * Zod validator for URL fields.
 * Accepts empty strings (optional fields) or valid URLs (with or without protocol).
 * Normalizes URLs before validation.
 */
export const urlSchema = z.string().refine(
  (val) => {
    // Empty strings are valid (optional field)
    if (!val || val.trim() === "") return true
    return isValidUrl(val)
  },
  { message: "Must be a valid URL (e.g., example.com or https://example.com)" }
)

/**
 * Zod validator for required URL fields.
 * Does not accept empty strings.
 */
export const requiredUrlSchema = z.string().refine(
  (val) => {
    if (!val || val.trim() === "") return false
    return isValidUrl(val)
  },
  { message: "Must be a valid URL (e.g., example.com or https://example.com)" }
)
