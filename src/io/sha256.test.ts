import { describe, expect, it } from 'vitest'
import { calculateSha256 } from './sha256'

describe('calculateSha256', () => {
  it('returns a lowercase hexadecimal SHA-256 digest', async () => {
    const bytes = new TextEncoder().encode('abc')

    await expect(calculateSha256(bytes)).resolves.toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })
})
