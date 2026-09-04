import { describe, expect, it } from 'vitest'
import type { AnnotationDocument } from '../domain/annotation-types'
import { createInitialEditorState } from '../state/editor-state'
import { createAnnotationJsonFile } from './annotation-json'

describe('createAnnotationJsonFile', () => {
  it('creates readable JSON with a stable filename and trailing newline', () => {
    const file = createAnnotationJsonFile(createAnnotation())

    expect(file.fileName).toBe('irs-1040-2025.annotation.json')
    expect(file.contents).toBe(`${JSON.stringify(createAnnotation(), null, 2)}\n`)
    expect(file.contents.endsWith('\n')).toBe(true)
  })

  it('sanitizes the form identifier before using it as a filename', () => {
    const annotation = createAnnotation()
    annotation.form.formId = '  Form 1040 / SR  '

    expect(createAnnotationJsonFile(annotation).fileName).toBe(
      'form-1040-sr-2025.annotation.json',
    )
  })
})

function createAnnotation(): AnnotationDocument {
  const initialDraft = createInitialEditorState().draft

  return {
    annotationVersion: '1.0',
    form: {
      formId: 'IRS-1040',
      title: 'U.S. Individual Income Tax Return',
      taxYear: 2025,
      revision: '2025-final',
      templateFile: 'f1040-2025.pdf',
      pages: [{ pageNumber: 1, widthPt: 612, heightPt: 792 }],
    },
    dataContract: initialDraft.dataContract,
    coordinateSystem: initialDraft.coordinateSystem,
    defaults: initialDraft.defaults,
    fields: [
      {
        id: 'form1040.line1a.wages',
        label: 'Line 1a wages',
        page: 1,
        source: { kind: 'json-pointer', pointer: '/income/wages' },
        box: { x: 0.7, y: 0.5, width: 0.2, height: 0.03 },
        format: {
          type: 'money',
          decimalPlaces: 0,
          useThousandsSeparator: true,
          showCurrencySymbol: false,
          currencySymbol: '$',
          negativeStyle: 'minus',
        },
      },
    ],
  }
}
