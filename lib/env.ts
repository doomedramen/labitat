import { createEnv } from "@t3-oss/env-nextjs"
import { z } from "zod/v4"

/**
 * Calculate Shannon entropy of a string to measure randomness.
 * Returns entropy in bits per character.
 */
function calculateEntropy(value: string): number {
  if (value.length === 0) return 0

  const freq = new Map<string, number>()
  for (const char of value) {
    freq.set(char, (freq.get(char) || 0) + 1)
  }

  let entropy = 0
  const len = value.length
  for (const count of freq.values()) {
    const p = count / len
    entropy -= p * Math.log2(p)
  }

  return entropy
}

/**
 * Check if a string has sufficient entropy.
 * Low-entropy strings (e.g., repeated characters) are rejected.
 */
function hasSufficientEntropy(value: string): boolean {
  const entropy = calculateEntropy(value)
  // Require at least 3.5 bits per character entropy
  // This rejects strings like "aaaa..." or "1234..."
  // while accepting random alphanumeric strings
  return entropy >= 3.5
}

export const env = createEnv({
  server: {
    SECRET_KEY: z
      .string()
      .min(32, "SECRET_KEY must be at least 32 characters")
      .refine(
        hasSufficientEntropy,
        "SECRET_KEY has insufficient entropy. Generate a secure key using: openssl rand -base64 32"
      ),
    DATABASE_URL: z.string().default("file:./data/labitat.db"),
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(3000),
    CACHE_DIR: z.string().optional(),
  },
  experimental__runtimeEnv: {},
  emptyStringAsUndefined: true,
})
