import { describe, expect, it } from 'vitest'
import { createManualDraft } from './create-manual-draft'

describe('createManualDraft', () => {
  it('creates an unmapped manual field with an injected stable ID', () => {
    const box = { x: 0.1, y: 0.2, width: 0.3, height: 0.04 }

    expect(createManualDraft({ page: 2, box }, () => 'manual:test-id')).toEqual({
      draftId: 'manual:test-id',
      origin: 'manual',
      mappingStatus: 'unmapped',
      page: 2,
      box,
    })
  })
})
