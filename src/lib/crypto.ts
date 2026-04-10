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
const SCRYPT_OPTIONS = { N: 65536, r: 8, p: 1, maxmem: 256 * 1024 * 1024 }
const SCRYPT_OPTIONS_LEGACY = {
  N: 16384,
  r: 8,
  p: 1,
  maxmem: 256 * 1024 * 1024,
}

/**
 * Derive a 256-bit encryption key from the SECRET_KEY using the given salt.
 */
function deriveKey(salt: Buffer): Buffer {
  const secret = env.SECRET_KEY
  if (!secret || secret.length < 32) {
    throw new Error("SECRET_KEY must be at least 32 characters for encryption")
  }
  return scryptSync(secret, salt, KEY_LENGTH, SCRYPT_OPTIONS)
}

/**
 * Derive a key using the legacy deterministic salt (secret-slice).
 * Used for decrypting ciphertext created before the random-salt migration.
 */
function deriveKeyLegacy(): Buffer {
  const secret = env.SECRET_KEY
  if (!secret || secret.length < 32) {
    throw new Error("SECRET_KEY must be at least 32 characters for encryption")
  }
  const salt = Buffer.from(secret.slice(0, SALT_LENGTH))
  return scryptSync(secret, salt, KEY_LENGTH, SCRYPT_OPTIONS_LEGACY)
}

/**
 * Encrypt a string using AES-256-GCM.
 * Returns a colon-delimited base64 string: salt:iv:authTag:ciphertext
 */
export async function encrypt(plaintext: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH)
  const key = deriveKey(salt)
  const iv = randomBytes(IV_LENGTH)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  let ciphertext = cipher.update(plaintext, "utf8", "base64")
  ciphertext += cipher.final("base64")

  const authTag = cipher.getAuthTag()

  // Format: salt:iv:authTag:ciphertext (all base64)
  return `${salt.toString("base64")}:${iv.toString("base64")}:${authTag.toString("base64")}:${ciphertext}`
}

/**
 * Decrypt a string encrypted with encrypt().
 * Supports both the current 4-part format (random salt) and the legacy 3-part format.
 */
export async function decrypt(encrypted: string): Promise<string> {
  const parts = encrypted.split(":")

  let key: Buffer
  let ivB64: string
  let authTagB64: string
  let ciphertextB64: string

  if (parts.length === 4) {
    // Current format: salt:iv:authTag:ciphertext
    const [saltB64, ...rest] = parts
    ;[ivB64, authTagB64, ciphertextB64] = rest
    key = deriveKey(Buffer.from(saltB64!, "base64"))
  } else if (parts.length === 3) {
    // Legacy format: iv:authTag:ciphertext (deterministic salt)
    ;[ivB64, authTagB64, ciphertextB64] = parts
    key = deriveKeyLegacy()
  } else {
    throw new Error("Invalid encrypted data format")
  }

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
