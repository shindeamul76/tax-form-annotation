export async function calculateSha256(bytes: Uint8Array): Promise<string> {
  const ownedBytes = Uint8Array.from(bytes)
  const digest = await globalThis.crypto.subtle.digest('SHA-256', ownedBytes)

  return Array.from(new Uint8Array(digest), (byte) =>
    byte.toString(16).padStart(2, '0'),
  ).join('')
}
