import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import type { AnnotationDocument, JsonValue } from '../domain/annotation-types'
import { createInitialEditorState } from '../state/editor-state'
import { generateFilledPdf } from './filled-pdf-renderer'

const dataset: JsonValue = {
  dataContract: {
    id: 'com.tax-form-annotator.taxpayer-return',
    version: '1.0',
  },
  taxpayer: { firstName: 'Jordan' },
}

describe('generateFilledPdf', () => {
  it('draws resolved values into a copy of the template', async () => {
    const templateBytes = await createTemplatePdf()
    const result = await generateFilledPdf({
      annotation: createAnnotation(),
      templateBytes,
      dataset,
    })

    expect(result.status).toBe('ready')
    if (result.status === 'ready') {
      expect(result.bytes.byteLength).toBeGreaterThan(templateBytes.byteLength)
      expect(result.diagnostics).toEqual([])

      const generatedDocument = await PDFDocument.load(result.bytes)
      expect(generatedDocument.getPageCount()).toBe(1)
    }
  })

  it('does not return PDF bytes when a value cannot fit', async () => {
    const annotation = createAnnotation()
    annotation.fields[0].source = {
      kind: 'constant',
      value: 'A value that is much too long for this tiny rectangle',
    }
    annotation.fields[0].box = {
      x: 0.1,
      y: 0.1,
      width: 0.01,
      height: 0.01,
    }
    annotation.fields[0].style = { overflow: 'error' }

    const result = await generateFilledPdf({
      annotation,
      templateBytes: await createTemplatePdf(),
      dataset,
    })

    expect(result).toMatchObject({
      status: 'error',
      diagnostics: [
        expect.objectContaining({
          code: 'PDF_TEXT_OVERFLOW',
          fieldId: 'form1040.taxpayer.firstName',
        }),
      ],
    })
  })

  it('reports fonts that are not registered by the sample renderer', async () => {
    const annotation = createAnnotation()
    annotation.defaults.style.fontFamily = 'Custom Tax Font'

    const result = await generateFilledPdf({
      annotation,
      templateBytes: await createTemplatePdf(),
      dataset,
    })

    expect(result).toMatchObject({
      status: 'error',
      diagnostics: [
        expect.objectContaining({ code: 'PDF_FONT_UNSUPPORTED' }),
      ],
    })
  })

  it('stops before loading the PDF when dataset resolution has errors', async () => {
    const annotation = createAnnotation()
    annotation.fields[0].source = {
      kind: 'json-pointer',
      pointer: '/taxpayer/missing',
    }
    annotation.fields[0].behavior = { onMissing: 'error' }

    const result = await generateFilledPdf({
      annotation,
      templateBytes: new Uint8Array([0]),
      dataset,
    })

    expect(result).toMatchObject({
      status: 'error',
      diagnostics: [
        expect.objectContaining({ code: 'FIELD_POINTER_MISSING' }),
      ],
    })
  })
})

async function createTemplatePdf(): Promise<Uint8Array> {
  const document = await PDFDocument.create()
  document.addPage([612, 792])
  return document.save()
}

function createAnnotation(): AnnotationDocument {
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
    defaults: {
      ...initialDraft.defaults,
      style: {
        ...initialDraft.defaults.style,
        fontSizePt: 10,
        minimumFontSizePt: 6,
        overflow: 'shrink',
      },
    },
    fields: [
      {
        id: 'form1040.taxpayer.firstName',
        label: 'Taxpayer first name',
        page: 1,
        source: {
          kind: 'json-pointer',
          pointer: '/taxpayer/firstName',
        },
        box: { x: 0.1, y: 0.1, width: 0.2, height: 0.03 },
        format: { type: 'text', trim: true, case: 'preserve' },
      },
    ],
  }
}
