import { describe, expect, it } from 'vitest'
import type { DraftFieldAnnotation } from '../domain/annotation-draft'
import { editorReducer } from '../state/editor-reducer'
import { selectAnnotationCandidate } from '../state/editor-selectors'
import { createInitialEditorState } from '../state/editor-state'
import { evaluateAnnotationReadiness } from './evaluate-annotation-readiness'

const mappedField: DraftFieldAnnotation = {
  draftId: 'manual:wages',
  origin: 'manual',
  mappingStatus: 'mapped',
  id: 'form1040.line1a.wages',
  label: 'Line 1a wages',
  page: 1,
  source: { kind: 'json-pointer', pointer: '/income/wages' },
  box: { x: 0.7, y: 0.5, width: 0.2, height: 0.03 },
  format: {
    type: 'money',
    decimalPlaces: 0,
    useThousandsSeparator: true,
    showCurrencySymbol: false,
    currencySymbol: '$',
    negativeStyle: 'minus',
  },
}

describe('evaluateAnnotationReadiness', () => {
  it('stops at draft completeness when required authoring work remains', () => {
    const state = createInitialEditorState()
    const result = evaluateAnnotationReadiness({
      draft: state.draft,
      candidate: selectAnnotationCandidate(state),
    })

    expect(result.isExportReady).toBe(false)
    expect(result.stages.map(({ status }) => status)).toEqual([
      'failed',
      'not-run',
      'not-run',
    ])
  })

  it('passes every stage for a complete annotation and matching template', () => {
    const state = createCompleteState()
    const result = evaluateAnnotationReadiness({
      draft: state.draft,
      candidate: selectAnnotationCandidate(state),
      template: state.template ?? undefined,
    })

    expect(result.isExportReady).toBe(true)
    expect(result.diagnostics).toEqual([])
    expect(result.stages.map(({ status }) => status)).toEqual([
      'passed',
      'passed',
      'passed',
    ])
  })

  it('reports semantic errors with field navigation details', () => {
    const state = createCompleteState({ ...mappedField, page: 2 })
    const result = evaluateAnnotationReadiness({
      draft: state.draft,
      candidate: selectAnnotationCandidate(state),
      template: state.template ?? undefined,
    })

    expect(result.isExportReady).toBe(false)
    expect(result.stages[2]?.status).toBe('failed')
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({
        code: 'FIELD_PAGE_NOT_FOUND',
        draftId: mappedField.draftId,
        page: 2,
      }),
    )
  })
})

function createCompleteState(field = mappedField) {
  const sha256 = 'a'.repeat(64)
  let state = editorReducer(createInitialEditorState(), {
    type: 'template/loadSucceeded',
    session: {
      fileName: 'form.pdf',
      bytes: new Uint8Array([1]),
      sha256,
      pages: [
        {
          pageNumber: 1,
          widthPt: 612,
          heightPt: 792,
          rotationDegrees: 0,
        },
      ],
    },
  })
  state = editorReducer(state, {
    type: 'form/metadataChanged',
    metadata: {
      formId: 'IRS-1040',
      title: 'U.S. Individual Income Tax Return',
      taxYear: 2025,
      revision: '2025-final',
    },
  })
  state = editorReducer(state, { type: 'field/created', field })
  return state
}
