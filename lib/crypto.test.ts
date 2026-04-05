import { describe, it, expect, vi, beforeEach } from "vitest"

// Mock the env module before importing crypto
vi.mock("@/lib/env", () => ({
  env: {
    SECRET_KEY: "test-secret-key-that-is-at-least-32-characters-long!",
  },
}))

const { encrypt, decrypt } = await import("@/lib/crypto")

describe("crypto", () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it("encrypts and decrypts a string", async () => {
    const plaintext = "secret-api-key-12345"
    const encrypted = await encrypt(plaintext)
    const decrypted = await decrypt(encrypted)
    expect(decrypted).toBe(plaintext)
  })

  it("produces different ciphertext for same plaintext", async () => {
    const plaintext = "same-secret"
    const encrypted1 = await encrypt(plaintext)
    const encrypted2 = await encrypt(plaintext)
    expect(encrypted1).not.toBe(encrypted2)
  })

  it("produces base64-encoded output", async () => {
    const encrypted = await encrypt("test")
    // Base64 regex: alphanumeric + /+=
    expect(encrypted).toMatch(/^[A-Za-z0-9+/]+=*$/)
  })

  it("throws on invalid base64 input", async () => {
    await expect(decrypt("not-valid-base64!!!")).rejects.toThrow()
  })
})
