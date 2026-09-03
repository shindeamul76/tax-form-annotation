import { describe, expect, it } from 'vitest'
import type { DraftFieldAnnotation } from '../domain/annotation-draft'
import { editorReducer } from './editor-reducer'
import {
  selectAnnotationCandidate,
  selectCurrentPageFields,
  selectHasIncompleteFields,
  selectSelectedField,
} from './editor-selectors'
import { createInitialEditorState } from './editor-state'

const mappedField: DraftFieldAnnotation = {
  draftId: 'manual:field-1',
  origin: 'manual',
  mappingStatus: 'mapped',
  id: 'taxpayer.firstName',
  label: 'Taxpayer first name',
  page: 1,
  source: { kind: 'json-pointer', pointer: '/taxpayer/firstName' },
  box: { x: 0.1, y: 0.2, width: 0.3, height: 0.04 },
  format: { type: 'text', trim: true, case: 'preserve' },
}

describe('editor selectors', () => {
  it('derives current-page and selected fields', () => {
    let state = createInitialEditorState()
    state = {
      ...state,
      draft: {
        ...state.draft,
        fields: [mappedField, { ...mappedField, draftId: 'page-2', page: 2 }],
      },
      ui: { ...state.ui, selectedDraftId: mappedField.draftId },
    }

    expect(selectCurrentPageFields(state)).toEqual([mappedField])
    expect(selectSelectedField(state)).toEqual(mappedField)
  })

  it('uses a pending box for display without changing the draft', () => {
    const initialState = createInitialEditorState()
    const pendingBox = { x: 0.25, y: 0.3, width: 0.2, height: 0.05 }
    const state = {
      ...initialState,
      draft: { ...initialState.draft, fields: [mappedField] },
      ui: {
        ...initialState.ui,
        selectedDraftId: mappedField.draftId,
        pendingFieldTransform: {
          draftId: mappedField.draftId,
          box: pendingBox,
        },
      },
    }

    expect(selectCurrentPageFields(state)[0]?.box).toEqual(pendingBox)
    expect(selectSelectedField(state)?.box).toEqual(pendingBox)
    expect(state.draft.fields[0]?.box).toEqual(mappedField.box)
  })

  it('returns no strict candidate while form metadata is incomplete', () => {
    const state = {
      ...createInitialEditorState(),
      draft: {
        ...createInitialEditorState().draft,
        fields: [mappedField],
      },
    }

    expect(selectAnnotationCandidate(state)).toBeNull()
  })

  it('creates a strict annotation candidate from complete mapped drafts', () => {
    let state = createInitialEditorState()
    state = editorReducer(state, {
      type: 'template/loadSucceeded',
      session: {
        fileName: 'form.pdf',
        bytes: new Uint8Array([1]),
        sha256: 'template-hash',
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
    state = editorReducer(state, {
      type: 'field/created',
      field: mappedField,
    })

    const candidate = selectAnnotationCandidate(state)

    expect(candidate).toMatchObject({
      form: {
        formId: 'IRS-1040',
        templateFile: 'form.pdf',
        templateSha256: 'template-hash',
      },
      fields: [
        {
          id: 'taxpayer.firstName',
          source: { pointer: '/taxpayer/firstName' },
        },
      ],
    })
    expect(selectHasIncompleteFields(state)).toBe(false)
  })

  it('reports incomplete draft fields', () => {
    const initialState = createInitialEditorState()
    const state = {
      ...initialState,
      draft: {
        ...initialState.draft,
        fields: [{ ...mappedField, mappingStatus: 'invalid' as const }],
      },
    }

    expect(selectHasIncompleteFields(state)).toBe(true)
  })
})
