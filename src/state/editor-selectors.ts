import type { DraftFieldAnnotation, DraftFormMetadata } from '../domain/annotation-draft'
import type {
  AnnotationDocument,
  FieldBehavior,
  FieldBehaviorOverride,
  FieldAnnotation,
  FieldStyle,
  FieldStyleOverride,
  FormMetadata,
} from '../domain/annotation-types'
import type { EditorState } from './editor-state'

export function selectCurrentPageFields(
  state: EditorState,
): DraftFieldAnnotation[] {
  return state.draft.fields
    .filter((field) => field.page === state.ui.currentPage)
    .map((field) => applyPendingFieldTransform(state, field))
}

export function selectSelectedField(
  state: EditorState,
): DraftFieldAnnotation | undefined {
  const field = state.draft.fields.find(
    (field) => field.draftId === state.ui.selectedDraftId,
  )

  return field === undefined
    ? undefined
    : applyPendingFieldTransform(state, field)
}

function applyPendingFieldTransform(
  state: EditorState,
  field: DraftFieldAnnotation,
): DraftFieldAnnotation {
  const transform = state.ui.pendingFieldTransform

  return transform?.draftId === field.draftId
    ? { ...field, box: transform.box }
    : field
}

export function selectAnnotationCandidate(
  state: EditorState,
): AnnotationDocument | null {
  const form = toStrictFormMetadata(state.draft.form)

  if (form === undefined) {
    return null
  }

  const fields: FieldAnnotation[] = []

  for (const draftField of state.draft.fields) {
    const field = toStrictFieldAnnotation(draftField)

    if (field === undefined) {
      return null
    }

    fields.push(field)
  }

  return {
    annotationVersion: state.draft.annotationVersion,
    form,
    dataContract: state.draft.dataContract,
    coordinateSystem: state.draft.coordinateSystem,
    defaults: state.draft.defaults,
    fields,
  }
}

export function selectHasIncompleteFields(state: EditorState): boolean {
  return state.draft.fields.some(
    ({ mappingStatus }) => mappingStatus !== 'mapped',
  )
}

function toStrictFormMetadata(
  draftForm: DraftFormMetadata,
): FormMetadata | undefined {
  if (
    !isNonBlank(draftForm.formId) ||
    !isNonBlank(draftForm.title) ||
    !Number.isInteger(draftForm.taxYear) ||
    draftForm.taxYear === undefined ||
    !isNonBlank(draftForm.revision) ||
    !isNonBlank(draftForm.templateFile) ||
    draftForm.pages.length === 0
  ) {
    return undefined
  }

  return {
    formId: draftForm.formId,
    title: draftForm.title,
    taxYear: draftForm.taxYear,
    revision: draftForm.revision,
    templateFile: draftForm.templateFile,
    ...(draftForm.templateSha256 === undefined
      ? {}
      : { templateSha256: draftForm.templateSha256 }),
    pages: draftForm.pages,
  }
}

function toStrictFieldAnnotation(
  draftField: DraftFieldAnnotation,
): FieldAnnotation | undefined {
  if (
    draftField.mappingStatus !== 'mapped' ||
    !isNonBlank(draftField.id) ||
    !isNonBlank(draftField.label) ||
    draftField.source === undefined ||
    draftField.format === undefined
  ) {
    return undefined
  }

  return {
    id: draftField.id,
    label: draftField.label,
    ...(draftField.description === undefined
      ? {}
      : { description: draftField.description }),
    page: draftField.page,
    source: draftField.source,
    box: draftField.box,
    format: draftField.format,
    ...(hasStyleOverride(draftField.style) ? { style: draftField.style } : {}),
    ...(hasBehaviorOverride(draftField.behavior)
      ? { behavior: draftField.behavior }
      : {}),
  }
}

function hasStyleOverride(
  value: Partial<FieldStyle> | undefined,
): value is FieldStyleOverride {
  return value !== undefined && Object.keys(value).length > 0
}

function hasBehaviorOverride(
  value: Partial<FieldBehavior> | undefined,
): value is FieldBehaviorOverride {
  return value !== undefined && Object.keys(value).length > 0
}

function isNonBlank(value: string | undefined): value is string {
  return value !== undefined && value.trim().length > 0
}
