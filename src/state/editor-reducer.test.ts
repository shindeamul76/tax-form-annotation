import { describe, expect, it } from 'vitest'
import type { DraftFieldAnnotation } from '../domain/annotation-draft'
import type { AnnotationDocument } from '../domain/annotation-types'
import { editorReducer } from './editor-reducer'
import {
  createInitialEditorState,
  type TemplateSession,
} from './editor-state'

const unmappedField: DraftFieldAnnotation = {
  draftId: 'acroform:1:field-1',
  origin: 'acroform',
  originalPdfFieldName: 'pdf.field.1',
  sourceFieldKind: 'text',
  mappingStatus: 'unmapped',
  page: 1,
  box: { x: 0.1, y: 0.2, width: 0.3, height: 0.04 },
}

describe('editorReducer', () => {
  it('creates an explicit empty editor state', () => {
    const state = createInitialEditorState()

    expect(state.template).toBeNull()
    expect(state.draft.fields).toEqual([])
    expect(state.ui).toMatchObject({
      currentPage: 1,
      zoom: 1.1,
      activeTool: 'select',
      selectedDraftId: null,
    })
    expect(state.isDirty).toBe(false)
  })

  it('stores template metadata without storing a PDF.js object', () => {
    const loadingState = editorReducer(createInitialEditorState(), {
      type: 'template/loadStarted',
    })
    const state = editorReducer(loadingState, {
      type: 'template/loadSucceeded',
      session: createTemplateSession(),
    })

    expect(state.templateLoad).toEqual({
      status: 'ready',
      errorMessage: null,
    })
    expect(state.draft.form).toEqual({
      templateFile: 'form.pdf',
      templateSha256: 'hash-a',
      pages: [{ pageNumber: 1, widthPt: 612, heightPt: 792 }],
    })
    expect(state.isDirty).toBe(true)
  })

  it('preserves drafts for the same template and clears them for a new one', () => {
    let state = editorReducer(createInitialEditorState(), {
      type: 'template/loadSucceeded',
      session: createTemplateSession(),
    })
    state = editorReducer(state, {
      type: 'fields/imported',
      fields: [unmappedField],
    })

    const sameTemplateState = editorReducer(state, {
      type: 'template/loadSucceeded',
      session: createTemplateSession(),
    })
    const newTemplateState = editorReducer(sameTemplateState, {
      type: 'template/loadSucceeded',
      session: createTemplateSession('hash-b'),
    })

    expect(sameTemplateState.draft.fields).toHaveLength(1)
    expect(newTemplateState.draft.fields).toEqual([])
  })

  it('deduplicates imported fields and derives their mapping status', () => {
    const state = editorReducer(createInitialEditorState(), {
      type: 'fields/imported',
      fields: [unmappedField, unmappedField],
    })

    expect(state.draft.fields).toHaveLength(1)
    expect(state.draft.fields[0]?.mappingStatus).toBe('unmapped')
  })

  it('marks a partial mapping invalid and a complete mapping mapped', () => {
    let state = editorReducer(createInitialEditorState(), {
      type: 'field/created',
      field: unmappedField,
    })
    state = editorReducer(state, {
      type: 'field/mappingChanged',
      draftId: unmappedField.draftId,
      mapping: { id: 'taxpayer.firstName' },
    })

    expect(state.draft.fields[0]?.mappingStatus).toBe('invalid')

    state = editorReducer(state, {
      type: 'field/mappingChanged',
      draftId: unmappedField.draftId,
      mapping: {
        label: 'Taxpayer first name',
        source: {
          kind: 'json-pointer',
          pointer: '/returns/federal/2025/taxpayer/firstName',
        },
        format: { type: 'text', trim: true, case: 'preserve' },
      },
    })

    expect(state.draft.fields[0]?.mappingStatus).toBe('mapped')
  })

  it('updates and removes a field through explicit actions', () => {
    let state = editorReducer(createInitialEditorState(), {
      type: 'field/created',
      field: unmappedField,
    })
    const movedBox = { x: 0.2, y: 0.3, width: 0.25, height: 0.05 }

    state = editorReducer(state, {
      type: 'field/boxChanged',
      draftId: unmappedField.draftId,
      box: movedBox,
    })
    state = editorReducer(state, {
      type: 'field/styleChanged',
      draftId: unmappedField.draftId,
      style: { horizontalAlign: 'center' },
    })

    expect(state.draft.fields[0]).toMatchObject({
      box: movedBox,
      style: { horizontalAlign: 'center' },
    })
    expect(state.ui.selectedDraftId).toBe(unmappedField.draftId)

    state = editorReducer(state, {
      type: 'field/removed',
      draftId: unmappedField.draftId,
    })

    expect(state.draft.fields).toEqual([])
    expect(state.ui.selectedDraftId).toBeNull()
  })

  it('keeps a field transform temporary until its box is committed', () => {
    let state = editorReducer(createInitialEditorState(), {
      type: 'field/created',
      field: unmappedField,
    })
    state = editorReducer(state, { type: 'editor/saved' })
    const previewBox = { x: 0.2, y: 0.3, width: 0.3, height: 0.04 }

    state = editorReducer(state, {
      type: 'ui/pendingFieldTransformChanged',
      transform: { draftId: unmappedField.draftId, box: previewBox },
    })

    expect(state.draft.fields[0]?.box).toEqual(unmappedField.box)
    expect(state.ui.pendingFieldTransform).toEqual({
      draftId: unmappedField.draftId,
      box: previewBox,
    })
    expect(state.isDirty).toBe(false)

    state = editorReducer(state, {
      type: 'field/boxChanged',
      draftId: unmappedField.draftId,
      box: previewBox,
    })

    expect(state.draft.fields[0]?.box).toEqual(previewBox)
    expect(state.ui.pendingFieldTransform).toBeNull()
    expect(state.isDirty).toBe(true)
  })

  it('rejects an out-of-page field transform', () => {
    const state = editorReducer(
      editorReducer(createInitialEditorState(), {
        type: 'field/created',
        field: unmappedField,
      }),
      { type: 'editor/saved' },
    )
    const nextState = editorReducer(state, {
      type: 'ui/pendingFieldTransformChanged',
      transform: {
        draftId: unmappedField.draftId,
        box: { x: 0.9, y: 0.2, width: 0.3, height: 0.04 },
      },
    })

    expect(nextState).toBe(state)
  })

  it('does not select a draft that is outside canonical state', () => {
    const state = createInitialEditorState()
    const nextState = editorReducer(state, {
      type: 'field/selected',
      draftId: 'missing-draft',
    })

    expect(nextState).toBe(state)
  })

  it('keeps navigation and zoom within the loaded document boundaries', () => {
    const twoPageSession = createTemplateSession()
    twoPageSession.pages.push({
      pageNumber: 2,
      widthPt: 612,
      heightPt: 792,
      rotationDegrees: 0,
    })
    let state = editorReducer(createInitialEditorState(), {
      type: 'template/loadSucceeded',
      session: twoPageSession,
    })

    state = editorReducer(state, { type: 'ui/pageChanged', pageNumber: 2 })
    state = editorReducer(state, { type: 'ui/zoomChanged', zoom: 99 })
    state = editorReducer(state, { type: 'ui/toolChanged', tool: 'draw' })

    expect(state.ui.currentPage).toBe(2)
    expect(state.ui.zoom).toBe(3)
    expect(state.ui.activeTool).toBe('draw')

    const unchangedState = editorReducer(state, {
      type: 'ui/pageChanged',
      pageNumber: 3,
    })
    expect(unchangedState).toBe(state)
  })

  it('converts an imported strict annotation into mapped editor drafts', () => {
    const state = editorReducer(createInitialEditorState(), {
      type: 'annotation/imported',
      annotation: createAnnotationDocument(),
    })

    expect(state.draft.fields[0]).toMatchObject({
      draftId: 'imported-json:0:taxpayer.firstName',
      origin: 'imported-json',
      mappingStatus: 'mapped',
    })
    expect(state.isDirty).toBe(false)
  })
})

function createTemplateSession(sha256 = 'hash-a'): TemplateSession {
  return {
    fileName: 'form.pdf',
    bytes: new Uint8Array([1, 2, 3]),
    sha256,
    pages: [
      {
        pageNumber: 1,
        widthPt: 612,
        heightPt: 792,
        rotationDegrees: 0,
      },
    ],
  }
}

function createAnnotationDocument(): AnnotationDocument {
  const initialDraft = createInitialEditorState().draft

  return {
    annotationVersion: '1.0',
    form: {
      formId: 'IRS-1040',
      title: 'U.S. Individual Income Tax Return',
      taxYear: 2025,
      revision: '2025-final',
      templateFile: 'form.pdf',
      pages: [{ pageNumber: 1, widthPt: 612, heightPt: 792 }],
    },
    dataContract: initialDraft.dataContract,
    coordinateSystem: initialDraft.coordinateSystem,
    defaults: initialDraft.defaults,
    fields: [
      {
        id: 'taxpayer.firstName',
        label: 'Taxpayer first name',
        page: 1,
        source: { kind: 'json-pointer', pointer: '/taxpayer/firstName' },
        box: { x: 0.1, y: 0.2, width: 0.3, height: 0.04 },
        format: { type: 'text', trim: true, case: 'preserve' },
      },
    ],
  }
}
