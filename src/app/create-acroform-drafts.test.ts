import { describe, expect, it } from 'vitest'
import { createAcroFormDraftFields } from './create-acroform-drafts'

describe('createAcroFormDraftFields', () => {
  it('converts imported PDF widgets into unmapped canonical drafts', () => {
    const fields = createAcroFormDraftFields([
      {
        importId: 'acroform:1:680R',
        origin: 'acroform',
        originalPdfFieldName: 'pdf.firstName',
        page: 1,
        widgetKind: 'text',
        box: { x: 0.1, y: 0.2, width: 0.3, height: 0.04 },
      },
    ])

    expect(fields).toEqual([
      {
        draftId: 'acroform:1:680R',
        origin: 'acroform',
        originalPdfFieldName: 'pdf.firstName',
        sourceFieldKind: 'text',
        mappingStatus: 'unmapped',
        page: 1,
        box: { x: 0.1, y: 0.2, width: 0.3, height: 0.04 },
      },
    ])
  })
})
