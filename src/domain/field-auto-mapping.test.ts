import { describe, expect, it } from 'vitest'
import type { DraftFieldAnnotation } from './annotation-draft'
import type { FieldAnnotation } from './annotation-types'
import { findAutomaticFieldMappings } from './field-auto-mapping'

const profileField: FieldAnnotation = {
  id: 'form1040.line1a.wages',
  label: 'Line 1a wages',
  page: 1,
  source: {
    kind: 'json-pointer',
    pointer: '/returns/federal/2025/income/wages',
  },
  box: { x: 0.823529, y: 0.568182, width: 0.117647, height: 0.01515 },
  format: {
    type: 'money',
    decimalPlaces: 0,
    useThousandsSeparator: true,
    showCurrencySymbol: false,
    currencySymbol: '$',
    negativeStyle: 'parentheses',
  },
}

const matchingDraft: DraftFieldAnnotation = {
  draftId: 'acroform:1:line-1a',
  origin: 'acroform',
  originalPdfFieldName: 'topmostSubform[0].Page1[0].f1_47[0]',
  sourceFieldKind: 'text',
  mappingStatus: 'unmapped',
  page: 1,
  box: {
    x: 0.8235294118,
    y: 0.5681818182,
    width: 0.1176470588,
    height: 0.0151502525,
  },
}

describe('findAutomaticFieldMappings', () => {
  it('matches an unmapped AcroForm field to a strongly overlapping profile box', () => {
    const mappings = findAutomaticFieldMappings(
      [matchingDraft],
      [profileField],
    )

    expect(mappings).toHaveLength(1)
    expect(mappings[0]).toMatchObject({
      draftId: matchingDraft.draftId,
      profileField: { id: profileField.id },
    })
    expect(mappings[0]?.overlapScore).toBeGreaterThan(0.99)
  })

  it('does not overwrite a field that already has manual mapping input', () => {
    const manuallyMappedDraft: DraftFieldAnnotation = {
      ...matchingDraft,
      id: 'custom.wages',
      label: 'Custom wages',
      source: { kind: 'json-pointer', pointer: '/custom/wages' },
      format: { type: 'number', decimalPlaces: 0, useThousandsSeparator: true, negativeStyle: 'minus' },
      mappingStatus: 'mapped',
    }

    expect(
      findAutomaticFieldMappings([manuallyMappedDraft], [profileField]),
    ).toEqual([])
  })

  it('does not reuse a profile ID that is already present in the draft', () => {
    const existingField: DraftFieldAnnotation = {
      ...matchingDraft,
      draftId: 'manual:wages',
      origin: 'manual',
      id: profileField.id,
      label: profileField.label,
      source: profileField.source,
      format: profileField.format,
      mappingStatus: 'mapped',
    }

    expect(
      findAutomaticFieldMappings(
        [existingField, matchingDraft],
        [profileField],
      ),
    ).toEqual([])
  })

  it('rejects weak positional matches and incompatible widget kinds', () => {
    const distantDraft = {
      ...matchingDraft,
      box: { ...matchingDraft.box, y: 0.7 },
    }
    const checkboxDraft: DraftFieldAnnotation = {
      ...matchingDraft,
      sourceFieldKind: 'checkbox',
    }

    expect(
      findAutomaticFieldMappings(
        [distantDraft, checkboxDraft],
        [profileField],
      ),
    ).toEqual([])
  })
})
