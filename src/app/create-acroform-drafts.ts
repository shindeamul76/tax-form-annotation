import type { DraftFieldAnnotation } from '../domain/annotation-draft'
import type { ImportedAcroFormField } from '../pdf/acroform-importer'

export function createAcroFormDraftFields(
  importedFields: ImportedAcroFormField[],
): DraftFieldAnnotation[] {
  return importedFields.map((field) => ({
    draftId: field.importId,
    origin: 'acroform',
    originalPdfFieldName: field.originalPdfFieldName,
    sourceFieldKind: field.widgetKind,
    mappingStatus: 'unmapped',
    page: field.page,
    box: { ...field.box },
    // A comb widget carries its own cell count, so an imported field keeps the
    // layout the template already declares instead of losing it at import.
    ...(field.characterCells === undefined
      ? {}
      : { style: { characterCells: field.characterCells } }),
  }))
}
