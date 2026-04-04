import { env } from "./env"

function getKeyMaterial(): ArrayBuffer {
  const key = env.SECRET_KEY
  const bytes = new TextEncoder().encode(key)
  // Use exactly 32 bytes; truncating a longer key is cryptographically safe
  const buf = new ArrayBuffer(32)
  new Uint8Array(buf).set(bytes.subarray(0, 32))
  return buf
}

async function importKey(): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    getKeyMaterial(),
    { name: "AES-GCM" },
    false,
    ["encrypt", "decrypt"]
  )
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await importKey()
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
  const key = await importKey()
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
