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

describe('createAcroFormDraftFields comb widgets', () => {
  it('seeds a comb widget style from the template cell count', () => {
    const [draft] = createAcroFormDraftFields([
      {
        importId: 'acroform:1:680R',
        origin: 'acroform',
        originalPdfFieldName: 'topmostSubform[0].Page1[0].f1_16[0]',
        page: 1,
        widgetKind: 'text',
        box: { x: 0.1, y: 0.1, width: 0.2, height: 0.02 },
        characterCells: 9,
      },
    ])

    expect(draft.style).toEqual({ characterCells: 9 })
  })

  it('leaves an ordinary widget without a style override', () => {
    const [draft] = createAcroFormDraftFields([
      {
        importId: 'acroform:1:681R',
        origin: 'acroform',
        originalPdfFieldName: 'topmostSubform[0].Page1[0].f1_01[0]',
        page: 1,
        widgetKind: 'text',
        box: { x: 0.1, y: 0.1, width: 0.2, height: 0.02 },
      },
    ])

    expect(draft.style).toBeUndefined()
  })
})
