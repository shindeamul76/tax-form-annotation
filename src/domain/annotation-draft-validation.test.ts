import { describe, expect, it } from 'vitest'
import type { AnnotationDraft } from './annotation-draft'
import { validateAnnotationDraft } from './annotation-draft-validation'
import { createInitialEditorState } from '../state/editor-state'

describe('validateAnnotationDraft', () => {
  it('reports missing document values and the absence of fields', () => {
    const diagnostics = validateAnnotationDraft(
      createInitialEditorState().draft,
    )

    expect(diagnostics.map(({ code }) => code)).toEqual(
      expect.arrayContaining([
        'FORM_ID_INVALID',
        'DRAFT_TEMPLATE_REQUIRED',
        'DRAFT_FORM_PAGES_REQUIRED',
        'DRAFT_FIELDS_REQUIRED',
      ]),
    )
  })

  it('identifies unfinished fields with navigation metadata', () => {
    const initialDraft = createInitialEditorState().draft
    const draft: AnnotationDraft = {
      ...initialDraft,
      form: {
        formId: 'IRS-1040',
        title: 'U.S. Individual Income Tax Return',
        taxYear: 2025,
        revision: '2025-final',
        templateFile: 'form.pdf',
        pages: [{ pageNumber: 1, widthPt: 612, heightPt: 792 }],
      },
      fields: [
        {
          draftId: 'acroform:1:wages',
          origin: 'acroform',
          originalPdfFieldName: 'topmostSubform[0].Page1[0].f1_01[0]',
          mappingStatus: 'unmapped',
          page: 1,
          box: { x: 0.1, y: 0.2, width: 0.2, height: 0.03 },
        },
      ],
    }

    expect(validateAnnotationDraft(draft)).toContainEqual(
      expect.objectContaining({
        code: 'DRAFT_FIELD_UNMAPPED',
        draftId: 'acroform:1:wages',
        page: 1,
        path: '/fields/0',
      }),
    )
  })
})
