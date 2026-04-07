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

  it("uses HKDF for key derivation (different keys produce different results)", async () => {
    // Test with original key
    const plaintext = "test-secret"
    const encrypted1 = await encrypt(plaintext)

    // Change the mock to use a different key
    vi.resetModules()
    vi.doMock("@/lib/env", () => ({
      env: {
        SECRET_KEY: "completely-different-secret-key-value-here!!",
      },
    }))

    const { encrypt: encrypt2, decrypt: decrypt2 } =
      await import("@/lib/crypto")
    const encrypted2 = await encrypt2(plaintext)

    // Different keys should produce different encrypted output
    expect(encrypted1).not.toBe(encrypted2)

    // And decryption should fail with wrong key
    await expect(decrypt2(encrypted1)).rejects.toThrow()
  })

  it("handles keys of varying lengths correctly", async () => {
    // Test with a longer key
    vi.resetModules()
    vi.doMock("@/lib/env", () => ({
      env: {
        SECRET_KEY:
          "this-is-a-much-longer-secret-key-with-plenty-of-entropy-for-testing!",
      },
    }))

    const { encrypt: encryptLong, decrypt: decryptLong } =
      await import("@/lib/crypto")

    const plaintext = "test-data"
    const encrypted = await encryptLong(plaintext)
    const decrypted = await decryptLong(encrypted)
    expect(decrypted).toBe(plaintext)
  })
})
