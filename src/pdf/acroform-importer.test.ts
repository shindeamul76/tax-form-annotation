import { describe, expect, it } from 'vitest'
import type { LoadedTemplatePageMetadata } from '../domain/template-types'
import type { PdfWidget } from './pdf-document'
import { importAcroFormWidgets } from './acroform-importer'

const letterPage: LoadedTemplatePageMetadata = {
  pageNumber: 1,
  widthPt: 612,
  heightPt: 792,
  rotationDegrees: 0,
}

const textWidget: PdfWidget = {
  pdfId: '680R',
  fieldName: 'topmostSubform[0].Page1[0].f1_01[0]',
  pageNumber: 1,
  kind: 'text',
  rectPt: {
    x1Pt: 228.8,
    y1Pt: 59.498,
    x2Pt: 316.8,
    y2Pt: 48.499,
  },
}

describe('importAcroFormWidgets', () => {
  it('normalizes a PDF.js top-left viewport rectangle', () => {
    const result = importAcroFormWidgets({
      pages: [letterPage],
      widgets: [textWidget],
    })

    expect(result.diagnostics).toEqual([])
    expect(result.fields).toHaveLength(1)
    expect(result.fields[0]).toMatchObject({
      importId: 'acroform:1:680R',
      origin: 'acroform',
      originalPdfFieldName: textWidget.fieldName,
      page: 1,
      widgetKind: 'text',
    })
    const importedBox = result.fields[0]?.box
    expect(importedBox?.x).toBeCloseTo(228.8 / 612)
    expect(importedBox?.y).toBeCloseTo(48.499 / 792)
    expect(importedBox?.width).toBeCloseTo(88 / 612)
    expect(importedBox?.height).toBeCloseTo(10.999 / 792)
  })

  it('reports and skips a widget whose page is missing', () => {
    const result = importAcroFormWidgets({ pages: [], widgets: [textWidget] })

    expect(result.fields).toEqual([])
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'ACROFORM_PAGE_NOT_FOUND' }),
    )
  })

  it('reports and skips an out-of-bounds widget rectangle', () => {
    const result = importAcroFormWidgets({
      pages: [letterPage],
      widgets: [
        {
          ...textWidget,
          rectPt: { x1Pt: -1, y1Pt: 10, x2Pt: 20, y2Pt: 30 },
        },
      ],
    })

    expect(result.fields).toEqual([])
    expect(result.diagnostics).toContainEqual(
      expect.objectContaining({ code: 'ACROFORM_BOX_INVALID' }),
    )
  })
})
