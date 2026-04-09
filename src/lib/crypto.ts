import {
  randomBytes,
  createCipheriv,
  createDecipheriv,
  scryptSync,
} from "crypto"
import { env } from "@/lib/env"

const ALGORITHM = "aes-256-gcm"
const KEY_LENGTH = 32
const IV_LENGTH = 16
const SALT_LENGTH = 16

/**
 * Derive a 256-bit encryption key from the SECRET_KEY.
 * Uses a fixed salt derived from the secret for deterministic key derivation.
 */
function deriveKey(): Buffer {
  const secret = env.SECRET_KEY
  if (!secret || secret.length < 32) {
    throw new Error("SECRET_KEY must be at least 32 characters for encryption")
  }
  // Use scrypt for key derivation with a deterministic salt
  const salt = Buffer.from(secret.slice(0, SALT_LENGTH))
  return scryptSync(secret, salt, KEY_LENGTH)
}

/**
 * Encrypt a string using AES-256-GCM.
 * Returns a base64-encoded string: iv + authTag + ciphertext
 */
export async function encrypt(plaintext: string): Promise<string> {
  const key = deriveKey()
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  let ciphertext = cipher.update(plaintext, "utf8", "base64")
  ciphertext += cipher.final("base64")

  const authTag = cipher.getAuthTag()

  // Format: iv:authTag:ciphertext (all base64)
  return `${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext}`
}

/**
 * Decrypt a string encrypted with encrypt().
 */
export async function decrypt(encrypted: string): Promise<string> {
  const key = deriveKey()
  const [ivB64, authTagB64, ciphertextB64] = encrypted.split(":")

  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error("Invalid encrypted data format")
  }

  const iv = Buffer.from(ivB64, "base64")
  const authTag = Buffer.from(authTagB64, "base64")

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(authTag)

  let plaintext = decipher.update(ciphertextB64, "base64", "utf8")
  plaintext += decipher.final("utf8")

  return plaintext
}
