// AES-256-GCM encryption helpers. The master key never leaves the Edge Function runtime.

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ''
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

async function getKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('MASTER_ENCRYPTION_KEY')
  if (!raw) throw new Error('MASTER_ENCRYPTION_KEY is not configured')
  const keyBytes = base64ToBytes(raw)
  if (keyBytes.length !== 32) throw new Error('MASTER_ENCRYPTION_KEY must be 32 bytes encoded in base64')
  return crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt'])
}

export async function encryptSecret(plaintext: string): Promise<{ ciphertext: string; iv: string }> {
  const key = await getKey()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const encoded = new TextEncoder().encode(plaintext)
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded)
  return { ciphertext: bytesToBase64(new Uint8Array(ciphertext)), iv: bytesToBase64(iv) }
}

export async function decryptSecret(ciphertext: string, iv: string): Promise<string> {
  const key = await getKey()
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(iv) },
    key,
    base64ToBytes(ciphertext),
  )
  return new TextDecoder().decode(plaintext)
}
