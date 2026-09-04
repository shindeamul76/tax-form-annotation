import { describe, expect, it } from 'vitest'
import type { DraftFormMetadata } from './annotation-draft'
import { validateDraftMetadata } from './metadata-validation'

const completeForm: DraftFormMetadata = {
  formId: 'IRS-1040',
  title: 'U.S. Individual Income Tax Return',
  taxYear: 2025,
  revision: '2025-final',
  templateFile: 'f1040-2025.pdf',
  pages: [{ pageNumber: 1, widthPt: 612, heightPt: 792 }],
}

describe('validateDraftMetadata', () => {
  it('accepts complete form and data-contract metadata', () => {
    expect(
      validateDraftMetadata(completeForm, {
        id: 'com.tax-form-annotator.taxpayer-return',
        version: '1.0',
      }),
    ).toEqual([])
  })

  it('returns an actionable diagnostic for every invalid editable value', () => {
    const diagnostics = validateDraftMetadata(
      {
        formId: 'IRS 1040',
        title: ' ',
        taxYear: 25,
        revision: '',
        pages: [],
      },
      { id: 'invalid contract', version: 'version-one' },
    )

    expect(diagnostics.map(({ path }) => path)).toEqual([
      '/form/formId',
      '/form/title',
      '/form/taxYear',
      '/form/revision',
      '/dataContract/id',
      '/dataContract/version',
    ])
  })
})
