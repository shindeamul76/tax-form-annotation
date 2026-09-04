import type { NormalizedBox } from '../domain/annotation-types'
import { isNormalizedBoxWithinPage } from '../domain/coordinates'
import type { Diagnostic } from '../domain/diagnostics'
import type { LoadedTemplatePageMetadata } from '../domain/template-types'
import type { PdfWidget, PdfWidgetKind } from './pdf-document'

export interface ImportedAcroFormField {
  importId: string
  origin: 'acroform'
  originalPdfFieldName: string
  page: number
  widgetKind: PdfWidgetKind
  box: NormalizedBox
  characterCells?: number
}

export interface AcroFormImportResult {
  fields: ImportedAcroFormField[]
  diagnostics: Diagnostic[]
}

export interface AcroFormImportInput {
  pages: LoadedTemplatePageMetadata[]
  widgets: PdfWidget[]
}

export function importAcroFormWidgets({
  pages,
  widgets,
}: AcroFormImportInput): AcroFormImportResult {
  const pagesByNumber = new Map(pages.map((page) => [page.pageNumber, page]))
  const fields: ImportedAcroFormField[] = []
  const diagnostics: Diagnostic[] = []

  for (const widget of widgets) {
    const importId = `acroform:${widget.pageNumber}:${widget.pdfId}`
    const page = pagesByNumber.get(widget.pageNumber)

    if (page === undefined) {
      diagnostics.push(
        createImportWarning(
          importId,
          widget.pageNumber,
          'ACROFORM_PAGE_NOT_FOUND',
          'An imported PDF field references a page that is not available.',
        ),
      )
      continue
    }

    const box = normalizeWidgetRectangle(widget, page)

    if (box === undefined || !isNormalizedBoxWithinPage(box)) {
      diagnostics.push(
        createImportWarning(
          importId,
          widget.pageNumber,
          'ACROFORM_BOX_INVALID',
          'An imported PDF field has an invalid or out-of-bounds rectangle.',
        ),
      )
      continue
    }

    fields.push({
      importId,
      origin: 'acroform',
      originalPdfFieldName: widget.fieldName,
      page: widget.pageNumber,
      widgetKind: widget.kind,
      box,
      ...(widget.characterCells === undefined
        ? {}
        : { characterCells: widget.characterCells }),
    })
  }

  return { fields, diagnostics }
}

function normalizeWidgetRectangle(
  widget: PdfWidget,
  page: LoadedTemplatePageMetadata,
): NormalizedBox | undefined {
  const rectangleValues = [
    widget.rectPt.x1Pt,
    widget.rectPt.y1Pt,
    widget.rectPt.x2Pt,
    widget.rectPt.y2Pt,
    page.widthPt,
    page.heightPt,
  ]

  if (
    !rectangleValues.every(Number.isFinite) ||
    page.widthPt <= 0 ||
    page.heightPt <= 0
  ) {
    return undefined
  }

  const leftPt = Math.min(widget.rectPt.x1Pt, widget.rectPt.x2Pt)
  const topPt = Math.min(widget.rectPt.y1Pt, widget.rectPt.y2Pt)
  const rightPt = Math.max(widget.rectPt.x1Pt, widget.rectPt.x2Pt)
  const bottomPt = Math.max(widget.rectPt.y1Pt, widget.rectPt.y2Pt)

  return {
    x: leftPt / page.widthPt,
    y: topPt / page.heightPt,
    width: (rightPt - leftPt) / page.widthPt,
    height: (bottomPt - topPt) / page.heightPt,
  }
}

function createImportWarning(
  draftId: string,
  page: number,
  code: string,
  message: string,
): Diagnostic {
  return {
    severity: 'warning',
    code,
    message,
    draftId,
    page,
  }
}
