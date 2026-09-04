import type { AnnotationDraft } from './annotation-draft'
import { validateAnnotationDefaults } from './annotation-defaults-validation'
import type { Diagnostic } from './diagnostics'
import { validateDraftMetadata } from './metadata-validation'

export function validateAnnotationDraft(
  draft: AnnotationDraft,
): Diagnostic[] {
  const diagnostics = [
    ...validateDraftMetadata(draft.form, draft.dataContract),
    ...validateAnnotationDefaults(draft.defaults),
  ]

  if (
    draft.form.templateFile === undefined ||
    draft.form.templateFile.trim().length === 0
  ) {
    diagnostics.push(createTemplateRequiredDiagnostic())
  }

  if (draft.form.pages.length === 0) {
    diagnostics.push({
      severity: 'error',
      code: 'DRAFT_FORM_PAGES_REQUIRED',
      message: 'Load a PDF template with at least one supported page.',
      path: '/form/pages',
    })
  }

  if (draft.fields.length === 0) {
    diagnostics.push({
      severity: 'error',
      code: 'DRAFT_FIELDS_REQUIRED',
      message: 'Add or import at least one field annotation.',
      path: '/fields',
    })
  }

  for (const [fieldIndex, field] of draft.fields.entries()) {
    if (field.mappingStatus === 'mapped') {
      continue
    }

    diagnostics.push({
      severity: 'error',
      code:
        field.mappingStatus === 'unmapped'
          ? 'DRAFT_FIELD_UNMAPPED'
          : 'DRAFT_FIELD_INVALID',
      message:
        field.mappingStatus === 'unmapped'
          ? `Map field "${getDraftFieldName(field)}" before export.`
          : `Correct the mapping for field "${getDraftFieldName(field)}" before export.`,
      draftId: field.draftId,
      fieldId: field.id,
      page: field.page,
      path: `/fields/${fieldIndex}`,
    })
  }

  return diagnostics
}

function createTemplateRequiredDiagnostic(): Diagnostic {
  return {
    severity: 'error',
    code: 'DRAFT_TEMPLATE_REQUIRED',
    message: 'Load a PDF template before export.',
    path: '/form/templateFile',
  }
}

function getDraftFieldName(
  field: AnnotationDraft['fields'][number],
): string {
  return field.label ?? field.originalPdfFieldName ?? field.draftId
}
