import type {
  DraftFieldAnnotation,
  DraftMappingStatus,
} from '../domain/annotation-draft'
import type { AnnotationDocument, ValueSource } from '../domain/annotation-types'
import { isNormalizedBoxWithinPage } from '../domain/coordinates'
import { isValidFieldFormat } from '../domain/field-format-validation'
import { isValidJsonPointerSyntax } from '../domain/json-pointer'
import type { EditorAction } from './editor-actions'
import {
  MAXIMUM_EDITOR_ZOOM,
  MINIMUM_EDITOR_ZOOM,
  type EditorState,
  type TemplateSession,
} from './editor-state'

export function editorReducer(
  state: EditorState,
  action: EditorAction,
): EditorState {
  switch (action.type) {
    case 'template/loadStarted':
      return {
        ...state,
        templateLoad: { status: 'loading', errorMessage: null },
      }
    case 'template/loadSucceeded':
      return loadTemplate(state, action.session)
    case 'template/loadFailed':
      return {
        ...state,
        templateLoad: {
          status: 'error',
          errorMessage: action.errorMessage,
        },
      }
    case 'form/metadataChanged':
      return {
        ...state,
        draft: {
          ...state.draft,
          form: { ...state.draft.form, ...action.metadata },
        },
        isDirty: true,
      }
    case 'dataContract/changed':
      return {
        ...state,
        draft: { ...state.draft, dataContract: action.dataContract },
        isDirty: true,
      }
    case 'defaults/styleChanged':
      return {
        ...state,
        draft: {
          ...state.draft,
          defaults: {
            ...state.draft.defaults,
            style: { ...state.draft.defaults.style, ...action.style },
          },
        },
        isDirty: true,
      }
    case 'defaults/behaviorChanged':
      return {
        ...state,
        draft: {
          ...state.draft,
          defaults: {
            ...state.draft.defaults,
            behavior: {
              ...state.draft.defaults.behavior,
              ...action.behavior,
            },
          },
        },
        isDirty: true,
      }
    case 'fields/imported':
      return importFields(state, action.fields)
    case 'fields/automaticallyMapped':
      return applyAutomaticFieldMappings(state, action.mappings)
    case 'fields/unmappedExcluded':
      return excludeUnmappedFields(state)
    case 'field/created':
      return createField(state, action.field)
    case 'field/selected':
      return selectField(state, action.draftId)
    case 'field/boxChanged':
      return changeFieldBox(state, action.draftId, action.box)
    case 'field/mappingChanged':
      return updateFieldMapping(state, action.draftId, action.mapping)
    case 'field/styleChanged':
      return updateField(state, action.draftId, (field) => ({
        ...field,
        style: { ...field.style, ...action.style },
      }))
    case 'field/behaviorChanged':
      return updateField(state, action.draftId, (field) => ({
        ...field,
        behavior: { ...field.behavior, ...action.behavior },
      }))
    case 'field/removed':
      return removeField(state, action.draftId)
    case 'dataset/loadStarted':
      return {
        ...state,
        sampleDataset: {
          ...state.sampleDataset,
          status: 'loading',
          errorMessage: null,
        },
      }
    case 'dataset/loaded':
      return {
        ...state,
        sampleDataset: {
          status: 'ready',
          session: action.session,
          errorMessage: null,
        },
        ui: { ...state.ui, previewEnabled: true },
      }
    case 'dataset/loadFailed':
      return {
        ...state,
        sampleDataset: {
          ...state.sampleDataset,
          status: 'error',
          errorMessage: action.errorMessage,
        },
      }
    case 'dataset/cleared':
      return {
        ...state,
        sampleDataset: {
          status: 'idle',
          session: null,
          errorMessage: null,
        },
        ui: { ...state.ui, previewEnabled: false },
      }
    case 'annotation/imported':
      return importAnnotation(state, action.annotation)
    case 'ui/pageChanged':
      return changePage(state, action.pageNumber)
    case 'ui/zoomChanged':
      return {
        ...state,
        ui: {
          ...state.ui,
          zoom: clamp(
            action.zoom,
            MINIMUM_EDITOR_ZOOM,
            MAXIMUM_EDITOR_ZOOM,
          ),
          pendingFieldTransform: null,
        },
      }
    case 'ui/toolChanged':
      return {
        ...state,
        ui: {
          ...state.ui,
          activeTool: action.tool,
          pendingSelection: null,
          pendingFieldTransform: null,
        },
      }
    case 'ui/pendingSelectionChanged':
      return {
        ...state,
        ui: { ...state.ui, pendingSelection: action.selection },
      }
    case 'ui/pendingFieldTransformChanged':
      return changePendingFieldTransform(state, action.transform)
    case 'ui/previewChanged':
      return {
        ...state,
        ui: { ...state.ui, previewEnabled: action.enabled },
      }
    case 'ui/detectedFieldsChanged':
      return {
        ...state,
        ui: { ...state.ui, showDetectedFields: action.visible },
      }
    case 'diagnostics/replaced':
      return { ...state, diagnostics: action.diagnostics }
    case 'editor/saved':
      return { ...state, isDirty: false }
  }
}

export function determineMappingStatus(
  field: DraftFieldAnnotation,
): DraftMappingStatus {
  const hasMappingInput =
    field.id !== undefined ||
    field.label !== undefined ||
    field.source !== undefined ||
    field.format !== undefined

  if (!hasMappingInput) {
    return 'unmapped'
  }

  if (
    !isNonBlank(field.id) ||
    !isNonBlank(field.label) ||
    field.source === undefined ||
    field.format === undefined ||
    !isValidDraftSource(field.source) ||
    !isValidFieldFormat(field.format)
  ) {
    return 'invalid'
  }

  return 'mapped'
}

function loadTemplate(
  state: EditorState,
  session: TemplateSession,
): EditorState {
  const isSameTemplate = state.template?.sha256 === session.sha256
  const form = isSameTemplate
    ? {
        ...state.draft.form,
        templateFile: session.fileName,
        templateSha256: session.sha256,
        pages: toDraftPages(session),
      }
    : {
        templateFile: session.fileName,
        templateSha256: session.sha256,
        pages: toDraftPages(session),
      }

  return {
    ...state,
    template: session,
    templateLoad: { status: 'ready', errorMessage: null },
    draft: {
      ...state.draft,
      form,
      fields: isSameTemplate ? state.draft.fields : [],
    },
    ui: {
      ...state.ui,
      currentPage: 1,
      selectedDraftId: isSameTemplate ? state.ui.selectedDraftId : null,
      pendingSelection: null,
      pendingFieldTransform: null,
    },
    diagnostics: [],
    isDirty: true,
  }
}

function toDraftPages(session: TemplateSession) {
  return session.pages.map(({ pageNumber, widthPt, heightPt }) => ({
    pageNumber,
    widthPt,
    heightPt,
  }))
}

function importFields(
  state: EditorState,
  fields: DraftFieldAnnotation[],
): EditorState {
  const existingDraftIds = new Set(
    state.draft.fields.map(({ draftId }) => draftId),
  )
  const newFields: DraftFieldAnnotation[] = []

  for (const field of fields) {
    if (existingDraftIds.has(field.draftId)) {
      continue
    }

    existingDraftIds.add(field.draftId)
    newFields.push({
      ...field,
      mappingStatus: determineMappingStatus(field),
    })
  }

  if (newFields.length === 0) {
    return state
  }

  return {
    ...state,
    draft: {
      ...state.draft,
      fields: deriveDocumentMappingStatuses([
        ...state.draft.fields,
        ...newFields,
      ]),
    },
    isDirty: true,
  }
}

function createField(
  state: EditorState,
  field: DraftFieldAnnotation,
): EditorState {
  if (state.draft.fields.some(({ draftId }) => draftId === field.draftId)) {
    return state
  }

  const createdField: DraftFieldAnnotation = {
    ...field,
    mappingStatus: determineMappingStatus(field),
  }
  const fields = deriveDocumentMappingStatuses([
    ...state.draft.fields,
    createdField,
  ])

  return {
    ...state,
    draft: {
      ...state.draft,
      fields,
    },
    ui: {
      ...state.ui,
      selectedDraftId: createdField.draftId,
      pendingFieldTransform: null,
    },
    isDirty: true,
  }
}

function applyAutomaticFieldMappings(
  state: EditorState,
  mappings: Extract<
    EditorAction,
    { type: 'fields/automaticallyMapped' }
  >['mappings'],
): EditorState {
  const mappingsByDraftId = new Map(
    mappings.map((mapping) => [mapping.draftId, mapping]),
  )
  let appliedMappingCount = 0
  const fields = state.draft.fields.map((field) => {
    const mapping = mappingsByDraftId.get(field.draftId)

    if (mapping === undefined || field.mappingStatus !== 'unmapped') {
      return field
    }

    appliedMappingCount += 1
    const profileField = mapping.profileField

    return {
      ...field,
      id: profileField.id,
      label: profileField.label,
      description: profileField.description,
      /*
       * A profile only applies to a checksum-identical template, so its box is
       * the human-verified geometry for this exact file. AcroForm rectangles
       * are suggestions and can be larger than the printed area they sit in,
       * which misaligns comb cells against pre-printed separator ticks.
       */
      box: { ...profileField.box },
      source: { ...profileField.source },
      format: { ...profileField.format },
      style: mergeOverrides(profileField.style, field.style),
      behavior: mergeOverrides(profileField.behavior, field.behavior),
    }
  })

  if (appliedMappingCount === 0) {
    return state
  }

  return {
    ...state,
    draft: {
      ...state.draft,
      fields: deriveDocumentMappingStatuses(fields),
    },
    isDirty: true,
  }
}

function excludeUnmappedFields(state: EditorState): EditorState {
  const excludedDraftIds = new Set(
    state.draft.fields
      .filter(({ mappingStatus }) => mappingStatus === 'unmapped')
      .map(({ draftId }) => draftId),
  )

  if (excludedDraftIds.size === 0) {
    return state
  }

  return {
    ...state,
    draft: {
      ...state.draft,
      fields: state.draft.fields.filter(
        ({ draftId }) => !excludedDraftIds.has(draftId),
      ),
    },
    ui: {
      ...state.ui,
      selectedDraftId:
        state.ui.selectedDraftId !== null &&
        excludedDraftIds.has(state.ui.selectedDraftId)
          ? null
          : state.ui.selectedDraftId,
      pendingFieldTransform:
        state.ui.pendingFieldTransform !== null &&
        excludedDraftIds.has(state.ui.pendingFieldTransform.draftId)
          ? null
          : state.ui.pendingFieldTransform,
    },
    isDirty: true,
  }
}

function updateFieldMapping(
  state: EditorState,
  draftId: string,
  mapping: Extract<EditorAction, { type: 'field/mappingChanged' }>['mapping'],
): EditorState {
  const updatedState = updateField(state, draftId, (field) => {
    const updatedField = { ...field, ...mapping }
    return {
      ...updatedField,
      mappingStatus: determineMappingStatus(updatedField),
    }
  })

  if (updatedState === state) {
    return state
  }

  return {
    ...updatedState,
    draft: {
      ...updatedState.draft,
      fields: deriveDocumentMappingStatuses(updatedState.draft.fields),
    },
  }
}

function updateField(
  state: EditorState,
  draftId: string,
  update: (field: DraftFieldAnnotation) => DraftFieldAnnotation,
): EditorState {
  const fieldIndex = state.draft.fields.findIndex(
    (field) => field.draftId === draftId,
  )

  if (fieldIndex === -1) {
    return state
  }

  const fields = [...state.draft.fields]
  fields[fieldIndex] = update(fields[fieldIndex])

  return {
    ...state,
    draft: { ...state.draft, fields },
    isDirty: true,
  }
}

function changeFieldBox(
  state: EditorState,
  draftId: string,
  box: DraftFieldAnnotation['box'],
): EditorState {
  if (!isNormalizedBoxWithinPage(box)) {
    return state
  }

  const updatedState = updateField(state, draftId, (field) => ({
    ...field,
    box,
  }))

  if (updatedState === state) {
    return state
  }

  return {
    ...updatedState,
    ui: { ...updatedState.ui, pendingFieldTransform: null },
  }
}

function changePendingFieldTransform(
  state: EditorState,
  transform: EditorState['ui']['pendingFieldTransform'],
): EditorState {
  if (transform === null) {
    if (state.ui.pendingFieldTransform === null) {
      return state
    }

    return {
      ...state,
      ui: { ...state.ui, pendingFieldTransform: null },
    }
  }

  const fieldExists = state.draft.fields.some(
    (field) => field.draftId === transform.draftId,
  )

  if (!fieldExists || !isNormalizedBoxWithinPage(transform.box)) {
    return state
  }

  return {
    ...state,
    ui: { ...state.ui, pendingFieldTransform: transform },
  }
}

function removeField(state: EditorState, draftId: string): EditorState {
  const fields = deriveDocumentMappingStatuses(
    state.draft.fields.filter((field) => field.draftId !== draftId),
  )

  if (fields.length === state.draft.fields.length) {
    return state
  }

  return {
    ...state,
    draft: { ...state.draft, fields },
    ui: {
      ...state.ui,
      selectedDraftId:
        state.ui.selectedDraftId === draftId
          ? null
          : state.ui.selectedDraftId,
      pendingFieldTransform:
        state.ui.pendingFieldTransform?.draftId === draftId
          ? null
          : state.ui.pendingFieldTransform,
    },
    isDirty: true,
  }
}

function selectField(
  state: EditorState,
  draftId: string | null,
): EditorState {
  if (
    draftId !== null &&
    !state.draft.fields.some((field) => field.draftId === draftId)
  ) {
    return state
  }

  return {
    ...state,
    ui: {
      ...state.ui,
      selectedDraftId: draftId,
      pendingFieldTransform: null,
    },
  }
}

function importAnnotation(
  state: EditorState,
  annotation: AnnotationDocument,
): EditorState {
  const fields = deriveDocumentMappingStatuses(
    annotation.fields.map(
      (field, fieldIndex): DraftFieldAnnotation => ({
        ...field,
        draftId: `imported-json:${fieldIndex}:${field.id}`,
        origin: 'imported-json',
        mappingStatus: 'mapped',
        style: field.style,
        behavior: field.behavior,
      }),
    ),
  )

  return {
    ...state,
    draft: {
      annotationVersion: annotation.annotationVersion,
      form: annotation.form,
      dataContract: annotation.dataContract,
      coordinateSystem: annotation.coordinateSystem,
      defaults: annotation.defaults,
      fields,
    },
    ui: {
      ...state.ui,
      currentPage: 1,
      selectedDraftId: null,
      pendingSelection: null,
      pendingFieldTransform: null,
    },
    diagnostics: [],
    isDirty: false,
  }
}

function changePage(state: EditorState, pageNumber: number): EditorState {
  const pageExists = state.draft.form.pages.some(
    (page) => page.pageNumber === pageNumber,
  )

  if (!pageExists) {
    return state
  }

  return {
    ...state,
    ui: {
      ...state.ui,
      currentPage: pageNumber,
      selectedDraftId: null,
      pendingSelection: null,
      pendingFieldTransform: null,
    },
  }
}

function isValidDraftSource(source: ValueSource): boolean {
  return source.kind === 'constant'
    ? typeof source.value !== 'number' || Number.isFinite(source.value)
    : isValidJsonPointerSyntax(source.pointer)
}

function deriveDocumentMappingStatuses(
  fields: DraftFieldAnnotation[],
): DraftFieldAnnotation[] {
  const baseStatuses = fields.map(determineMappingStatus)
  const mappedIdCounts = new Map<string, number>()

  for (const [fieldIndex, field] of fields.entries()) {
    if (baseStatuses[fieldIndex] === 'mapped' && field.id !== undefined) {
      mappedIdCounts.set(field.id, (mappedIdCounts.get(field.id) ?? 0) + 1)
    }
  }

  return fields.map((field, fieldIndex) => {
    const baseStatus = baseStatuses[fieldIndex]
    const mappingStatus =
      baseStatus === 'mapped' &&
      field.id !== undefined &&
      (mappedIdCounts.get(field.id) ?? 0) > 1
        ? 'invalid'
        : baseStatus

    return field.mappingStatus === mappingStatus
      ? field
      : { ...field, mappingStatus }
  })
}

function isNonBlank(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0
}

function clamp(value: number, minimum: number, maximum: number): number {
  if (!Number.isFinite(value)) {
    return minimum
  }

  return Math.min(Math.max(value, minimum), maximum)
}

function mergeOverrides<Value extends object>(
  profileOverride: Value | undefined,
  existingOverride: Partial<Value> | undefined,
): Value | Partial<Value> | undefined {
  if (profileOverride === undefined && existingOverride === undefined) {
    return undefined
  }

  return { ...profileOverride, ...existingOverride }
}
