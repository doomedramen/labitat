import { describe, it, expect } from "vitest"
import { encrypt, decrypt } from "@/lib/crypto"

describe("crypto", () => {
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
