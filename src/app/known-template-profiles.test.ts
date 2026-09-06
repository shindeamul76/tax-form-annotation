import { describe, expect, it } from 'vitest'
import { findKnownTemplateProfile } from './known-template-profiles'

const FORM_1040_2025_SHA256 =
  '3d31c226df0d189ced80e039d01cf0f8820c1019681a0f0ca6264de277b7e982'

describe('findKnownTemplateProfile', () => {
  it('returns the verified profile only for its exact template checksum', () => {
    expect(findKnownTemplateProfile(FORM_1040_2025_SHA256)?.fields).toHaveLength(
      111,
    )
    expect(findKnownTemplateProfile('different-template')).toBeUndefined()
  })
})
