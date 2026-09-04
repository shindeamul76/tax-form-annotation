/// <reference types="node" />

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { PDFDocument } from 'pdf-lib'
import { describe, expect, it } from 'vitest'
import annotationExample from '../../examples/annotations/form-1040-2025.annotation.json'
import datasetExample from '../../examples/data/sample-taxpayer-data.json'
import type { AnnotationDocument } from '../domain/annotation-types'
import { generateFilledPdf } from './filled-pdf-renderer'

describe('filled PDF example integration', () => {
  it('renders the included annotation and dataset over the exact Form 1040 template', async () => {
    const templateBytes = await readFile(
      resolve(process.cwd(), 'examples/templates/f1040-2025.pdf'),
    )
    const result = await generateFilledPdf({
      annotation: annotationExample as AnnotationDocument,
      templateBytes,
      dataset: datasetExample,
    })

    if (result.status === 'error') {
      throw new Error(JSON.stringify(result.diagnostics))
    }

    expect(result.bytes.byteLength).toBeGreaterThan(templateBytes.byteLength)
    expect(result.diagnostics).toEqual([])

    const generatedDocument = await PDFDocument.load(result.bytes)
    expect(generatedDocument.getPageCount()).toBe(2)
  })
})
