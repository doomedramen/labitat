import { env } from "./env"

// Salt for HKDF - fixed value to ensure consistent key derivation
// This is not a secret value, just a domain separation constant
const HKDF_SALT = new TextEncoder().encode("labitat-crypto-v1")
// Info parameter for HKDF - identifies the purpose of the derived key
const HKDF_INFO = new TextEncoder().encode("aes-256-gcm-key")

/**
 * Derives a 256-bit AES-GCM key from the SECRET_KEY using HKDF-SHA256.
 * This properly extracts entropy from the input key material rather than
 * simply truncating it.
 */
async function deriveKey(): Promise<CryptoKey> {
  const keyMaterial = new TextEncoder().encode(env.SECRET_KEY)

  // Import raw key material for HKDF
  const importedKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    "HKDF",
    false,
    ["deriveKey"]
  )

  // Derive a 256-bit AES-GCM key using HKDF-SHA256
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: HKDF_SALT,
      info: HKDF_INFO,
    },
    importedKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await deriveKey()
  const iv = crypto.getRandomValues(
    new Uint8Array(12) as Uint8Array<ArrayBuffer>
  )
  const data = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    data
  )
  const combined = new Uint8Array(12 + ciphertext.byteLength)
  combined.set(iv)
  combined.set(new Uint8Array(ciphertext), 12)
  return Buffer.from(combined).toString("base64")
}

export async function decrypt(encoded: string): Promise<string> {
  const key = await deriveKey()
  const combined = Buffer.from(encoded, "base64")
  const iv = combined.subarray(0, 12) as Uint8Array<ArrayBuffer>
  const ciphertext = combined.subarray(12)
  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  )
  return new TextDecoder().decode(plaintext)
}
