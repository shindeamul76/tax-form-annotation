import { describe, expect, it, vi } from 'vitest'
import type { LoadedTemplatePageMetadata } from '../domain/template-types'
import type {
  PdfTemplateDocument,
  PdfWidget,
} from '../pdf/pdf-document'
import { loadPdfTemplate } from './load-pdf-template'

const page: LoadedTemplatePageMetadata = {
  pageNumber: 1,
  widthPt: 612,
  heightPt: 792,
  rotationDegrees: 0,
}

const widget: PdfWidget = {
  pdfId: 'field-1',
  fieldName: 'example.field',
  pageNumber: 1,
  kind: 'text',
  rectPt: { x1Pt: 61.2, y1Pt: 79.2, x2Pt: 183.6, y2Pt: 99 },
}

describe('loadPdfTemplate', () => {
  it('builds one template result from checksum, page, and widget data', async () => {
    const bytes = new Uint8Array([1, 2, 3])
    const document = createDocument()

    const result = await loadPdfTemplate({
      fileName: 'example.pdf',
      bytes,
      documentLoader: {
        load: () => Promise.resolve(document),
      },
    })

    expect(result.session.fileName).toBe('example.pdf')
    expect(result.session.sha256).toMatch(/^[a-f0-9]{64}$/)
    expect(result.session.pages).toEqual([page])
    expect(result.session.bytes).toEqual(bytes)
    expect(result.session.bytes).not.toBe(bytes)
    expect(result.importedFields[0]).toMatchObject({
      importId: 'acroform:1:field-1',
      originalPdfFieldName: 'example.field',
      page: 1,
    })
  })

  it('destroys the PDF document when inspection fails', async () => {
    const destroyDocument = vi.fn(() => Promise.resolve())
    const document = createDocument({
      destroy: destroyDocument,
      getPageMetadata: () => Promise.reject(new Error('Inspection failed.')),
    })

    await expect(
      loadPdfTemplate({
        fileName: 'broken.pdf',
        bytes: new Uint8Array([1]),
        documentLoader: {
          load: () => Promise.resolve(document),
        },
      }),
    ).rejects.toThrow('Inspection failed.')
    expect(destroyDocument).toHaveBeenCalledOnce()
  })
})

function createDocument(
  overrides: Partial<PdfTemplateDocument> = {},
): PdfTemplateDocument {
  return {
    pageCount: 1,
    getPageMetadata: () => Promise.resolve([page]),
    getWidgets: () => Promise.resolve([widget]),
    renderPage: () =>
      Promise.resolve({ widthPx: 612, heightPx: 792, rotationDegrees: 0 }),
    destroy: () => Promise.resolve(),
    ...overrides,
  }
}
