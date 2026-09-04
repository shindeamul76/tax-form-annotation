import { describe, expect, it } from 'vitest'
import sampleDatasetJson from '../../examples/data/sample-taxpayer-data.json'
import type { DraftFieldAnnotation } from '../domain/annotation-draft'
import { findAutomaticFieldMappings } from '../domain/field-auto-mapping'
import { parseJsonDataset } from '../io/json-dataset'
import { editorReducer } from '../state/editor-reducer'
import { createAnnotationCandidate } from '../state/editor-selectors'
import {
  createInitialEditorState,
  type TemplateSession,
} from '../state/editor-state'
import { evaluateAnnotationReadiness } from './evaluate-annotation-readiness'
import { findKnownTemplateProfile } from './known-template-profiles'

const FORM_1040_2025_SHA256 =
  '3d31c226df0d189ced80e039d01cf0f8820c1019681a0f0ca6264de277b7e982'

describe('Form 1040 demo export workflow', () => {
  it('becomes export-ready after auto-mapping and bulk exclusion', () => {
    const profile = findKnownTemplateProfile(FORM_1040_2025_SHA256)

    if (profile === undefined) {
      throw new Error('Expected the included Form 1040 profile.')
    }

    const template: TemplateSession = {
      fileName: profile.form.templateFile,
      bytes: new Uint8Array([1, 2, 3]),
      sha256: FORM_1040_2025_SHA256,
      pages: profile.form.pages.map((page) => ({
        ...page,
        rotationDegrees: 0,
      })),
    }
    const importedFields = [
      ...profile.fields.map(
        (field, fieldIndex): DraftFieldAnnotation => ({
          draftId: `acroform:${field.page}:${fieldIndex}`,
          origin: 'acroform',
          originalPdfFieldName: `pdf.field.${fieldIndex}`,
          sourceFieldKind:
            field.format.type === 'checkbox' ? 'checkbox' : 'text',
          mappingStatus: 'unmapped',
          page: field.page,
          box: { ...field.box },
        }),
      ),
      createUnusedDraft(),
    ]
    let state = editorReducer(createInitialEditorState(), {
      type: 'template/loadSucceeded',
      session: template,
    })
    state = editorReducer(state, {
      type: 'form/metadataChanged',
      metadata: {
        formId: profile.form.formId,
        title: profile.form.title,
        taxYear: profile.form.taxYear,
        revision: profile.form.revision,
      },
    })
    state = editorReducer(state, {
      type: 'dataContract/changed',
      dataContract: profile.dataContract,
    })
    state = editorReducer(state, {
      type: 'fields/imported',
      fields: importedFields,
    })

    const mappings = findAutomaticFieldMappings(
      state.draft.fields,
      profile.fields,
    )
    state = editorReducer(state, {
      type: 'fields/automaticallyMapped',
      mappings,
    })
    state = editorReducer(state, { type: 'fields/unmappedExcluded' })

    const candidate = createAnnotationCandidate(state.draft)
    const dataset = parseJsonDataset(JSON.stringify(sampleDatasetJson))
    const readiness = evaluateAnnotationReadiness({
      draft: state.draft,
      candidate,
      template,
      dataset,
    })

    expect(mappings).toHaveLength(6)
    expect(state.draft.fields).toHaveLength(6)
    expect(readiness.diagnostics).toEqual([])
    expect(readiness.isExportReady).toBe(true)
  })
})

function createUnusedDraft(): DraftFieldAnnotation {
  return {
    draftId: 'acroform:1:unused',
    origin: 'acroform',
    originalPdfFieldName: 'pdf.unused',
    sourceFieldKind: 'text',
    mappingStatus: 'unmapped',
    page: 1,
    box: { x: 0.05, y: 0.9, width: 0.1, height: 0.02 },
  }
}
